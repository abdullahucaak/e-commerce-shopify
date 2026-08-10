import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import {
  findStorefrontRuntimeConfig,
  normalizeStorefrontHostname
} from './storefront-config.mjs'
import { findAccountContext, readBearerToken } from './auth.mjs'
import { publishDesignConfig, readDesignConfig } from './design-config.mjs'

export function buildApp({
  database,
  verifyAccessToken = async () => null,
  shopifyOAuth = null,
  logger = true,
  shopifyApiVersion = '2026-07',
  allowStorefrontHostOverride = false,
  trustProxy = false
} = {}) {
  if (!database?.query) throw new Error('database.query is required.')

  const app = Fastify({ logger, trustProxy })

  app.register(helmet, {
    contentSecurityPolicy: false
  })
  app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT']
  })

  app.get('/api/health', async () => ({ status: 'ok' }))

  app.get('/api/account', async (request, reply) => {
    const accessToken = readBearerToken(request.headers.authorization)
    if (!accessToken) {
      return reply.code(401).send({ error: 'authentication_required' })
    }

    let user
    try {
      user = await verifyAccessToken(accessToken)
    } catch (error) {
      app.log.error({ err: error }, 'Supabase access token verification failed')
      return reply.code(503).send({ error: 'authentication_unavailable' })
    }

    if (!user) {
      return reply.code(401).send({ error: 'invalid_access_token' })
    }

    try {
      return await findAccountContext({ database, user })
    } catch (error) {
      app.log.error({ err: error, userId: user.id }, 'Account context lookup failed')
      return reply.code(503).send({ error: 'account_unavailable' })
    }
  })

  async function authenticatedUser(request, reply) {
    const accessToken = readBearerToken(request.headers.authorization)
    if (!accessToken) return reply.code(401).send({ error: 'authentication_required' })
    const user = await verifyAccessToken(accessToken)
    if (!user) return reply.code(401).send({ error: 'invalid_access_token' })
    return user
  }

  app.get('/api/storefronts/:storefrontId/design', async (request, reply) => {
    try {
      const user = await authenticatedUser(request, reply)
      if (!user?.id) return
      const config = await readDesignConfig({
        database, userId: user.id, storefrontId: request.params.storefrontId
      })
      if (!config) return reply.code(404).send({ error: 'storefront_not_found' })
      return config
    } catch (error) {
      app.log.error({ err: error }, 'Design configuration lookup failed')
      return reply.code(503).send({ error: 'design_config_unavailable' })
    }
  })

  app.put('/api/storefronts/:storefrontId/design', async (request, reply) => {
    try {
      const user = await authenticatedUser(request, reply)
      if (!user?.id) return
      return await publishDesignConfig({
        database, userId: user.id, storefrontId: request.params.storefrontId,
        settings: request.body
      })
    } catch (error) {
      if (error.message === 'invalid_design_settings') {
        return reply.code(400).send({ error: 'invalid_design_settings' })
      }
      if (['storefront_access_denied', 'storefront_write_denied'].includes(error.message)) {
        return reply.code(403).send({ error: error.message })
      }
      app.log.error({ err: error }, 'Design configuration publish failed')
      return reply.code(503).send({ error: 'design_config_unavailable' })
    }
  })

  app.post('/api/shopify/connect', async (request, reply) => {
    if (!shopifyOAuth) {
      return reply.code(503).send({ error: 'shopify_oauth_unavailable' })
    }

    const accessToken = readBearerToken(request.headers.authorization)
    if (!accessToken) {
      return reply.code(401).send({ error: 'authentication_required' })
    }

    let user
    try {
      user = await verifyAccessToken(accessToken)
    } catch (error) {
      app.log.error({ err: error }, 'Supabase access token verification failed')
      return reply.code(503).send({ error: 'authentication_unavailable' })
    }

    if (!user) {
      return reply.code(401).send({ error: 'invalid_access_token' })
    }

    try {
      const authorizationUrl = await shopifyOAuth.begin({
        user,
        workspaceId: request.body?.workspaceId,
        shop: request.body?.shop
      })
      return { authorizationUrl }
    } catch (error) {
      if (error.message === 'invalid_shop_domain') {
        return reply.code(400).send({ error: 'invalid_shop_domain' })
      }
      if (error.message === 'workspace_access_denied') {
        return reply.code(403).send({ error: 'workspace_access_denied' })
      }

      app.log.error({ err: error, userId: user.id }, 'Shopify OAuth start failed')
      return reply.code(503).send({ error: 'shopify_oauth_start_failed' })
    }
  })

  app.get('/api/shopify/callback', async (request, reply) => {
    if (!shopifyOAuth) {
      return reply.code(503).send({ error: 'shopify_oauth_unavailable' })
    }

    try {
      const redirectUrl = await shopifyOAuth.complete(request.raw.url)
      return reply.redirect(redirectUrl)
    } catch (error) {
      app.log.error({ err: error }, 'Shopify OAuth callback failed')
      return reply.code(400).send({ error: 'shopify_oauth_callback_failed' })
    }
  })

  app.get('/api/shopify/install', async (request, reply) => {
    if (!shopifyOAuth) {
      return reply.code(503).send({ error: 'shopify_oauth_unavailable' })
    }

    return reply.redirect(shopifyOAuth.installRedirect(request.query?.shop))
  })

  app.get('/api/ready', async (_request, reply) => {
    try {
      await database.query('select 1')
      return { status: 'ok', database: 'reachable' }
    } catch (error) {
      app.log.error({ err: error }, 'Database readiness check failed')
      return reply.code(503).send({
        status: 'unavailable',
        database: 'unreachable'
      })
    }
  })

  app.get('/api/storefront/config', async (request, reply) => {
    const requestedOverride = request.query?.host

    if (requestedOverride && !allowStorefrontHostOverride) {
      return reply.code(400).send({
        error: 'storefront_host_override_disabled'
      })
    }

    let hostname
    try {
      hostname = normalizeStorefrontHostname(
        requestedOverride || request.hostname
      )
    } catch {
      return reply.code(400).send({ error: 'invalid_storefront_hostname' })
    }

    try {
      const config = await findStorefrontRuntimeConfig({
        database,
        hostname,
        shopifyApiVersion
      })

      if (!config) {
        return reply.code(404).send({ error: 'storefront_not_found' })
      }

      reply.header('cache-control', 'public, max-age=60, stale-while-revalidate=300')
      return config
    } catch (error) {
      app.log.error({ err: error, hostname }, 'Storefront configuration lookup failed')
      return reply.code(503).send({ error: 'storefront_config_unavailable' })
    }
  })

  return app
}
