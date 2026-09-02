import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import {
  findStorefrontRuntimeConfig,
  normalizeStorefrontHostname
} from './storefront-config.mjs'
import { findAccountContext, readBearerToken } from './auth.mjs'
import { authorizePlatformAdmin } from './platform-admin-auth.mjs'
import { listPlatformOperations, listPlatformStores, listPlatformWorkspaces, readPlatformCatalog, readPlatformOverview, readPlatformStore, setPlatformCatalogActive, setPlatformStorefrontStatus } from './platform-admin-operations.mjs'
import { publishDesignConfig, readDesignConfig, saveDesignDraft } from './design-config.mjs'
import { publishContentConfig, readContentConfig, saveContentDraft } from './content-config.mjs'
import { listCmsConfigVersions, restoreCmsConfigVersion } from './cms-config-versions.mjs'
import {
  completeBrandSetup,
  completeDomainSetup,
  completeOnboarding,
  completeStorePreview,
  readOnboarding,
  selectBannerPreset,
  selectNiche,
  selectStorePlan,
  skipDomainSetup
} from './onboarding.mjs'

export function buildApp({
  database,
  fastifyFactory = Fastify,
  verifyAccessToken = async () => null,
  shopifyOAuth = null,
  shopifyDomains = null,
  shopifyWebhooks = null,
  stripeBilling = null,
  mockBilling = null,
  productReadiness = null,
  authHandoff = null,
  storefrontAssets = null,
  storefrontPreview = null,
  billingProvider = 'disabled',
  logger = true,
  shopifyApiVersion = '2026-07',
  allowStorefrontHostOverride = false,
  trustProxy = false,
  requestBodyLimitBytes = 1024 * 1024,
  rateLimitMax = 300,
  rateLimitWindowMs = 60 * 1000
} = {}) {
  if (!database?.query) throw new Error('database.query is required.')

  const sensitiveLogPaths = [
    'req.headers.authorization',
    'req.headers.cookie',
    'req.headers["stripe-signature"]',
    'req.headers["x-shopify-hmac-sha256"]',
    'err.accessToken',
    'err.refreshToken',
    'err.code',
    'accessToken',
    'refreshToken',
    'supabaseServiceRoleKey',
    'admin_access_token_ciphertext',
    'storefront_public_access_token'
  ]
  const loggerOptions = logger && typeof logger === 'object'
    ? { ...logger, redact: { paths: sensitiveLogPaths, censor: '[REDACTED]' } }
    : logger === true
      ? { redact: { paths: sensitiveLogPaths, censor: '[REDACTED]' } }
      : logger
  const app = fastifyFactory({
    logger: loggerOptions,
    trustProxy,
    bodyLimit: requestBodyLimitBytes
  })
  const installIntentCookie = 'yourprostore_shopify_intent'
  const maxStorefrontAssetRequestBytes = (8 * 1024 * 1024) + (64 * 1024)

  function readCookie(header, name) {
    return String(header || '').split(';').map(value => value.trim()).reduce((found, value) => {
      if (found) return found
      const separator = value.indexOf('=')
      return separator > 0 && value.slice(0, separator) === name
        ? decodeURIComponent(value.slice(separator + 1))
        : ''
    }, '')
  }

  // Shopify signs the exact bytes it sends. Preserve those bytes while still
  // exposing parsed JSON to all existing API routes.
  app.removeContentTypeParser('application/json')
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (request, body, done) => {
    request.rawBody = body
    try {
      done(null, JSON.parse(body.toString('utf8')))
    } catch (error) {
      error.statusCode = 400
      done(error)
    }
  })

  app.register(helmet, {
    contentSecurityPolicy: false
  })
  app.register(cors, {
    origin: '*',
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['authorization', 'content-type', 'storefrontpreview'],
    maxAge: 600,
    strictPreflight: true
  })
  app.register(multipart, {
    limits: {
      files: 1,
      fields: 0,
      parts: 1,
      fileSize: 8 * 1024 * 1024
    }
  })

  app.register(async function apiRoutes(app) {
    await app.register(rateLimit, {
      global: true,
      max: rateLimitMax,
      timeWindow: rateLimitWindowMs,
      cache: 10_000,
      enableDraftSpec: true,
      errorResponseBuilder: (_request, context) => ({
        statusCode: 429,
        error: 'rate_limit_exceeded',
        retryAfterSeconds: context.ttlInSeconds
      })
    })

    app.get('/api/health', { config: { rateLimit: false } }, async () => ({ status: 'ok' }))

  app.post('/api/shopify/webhooks', {
    config: { rateLimit: { max: 1000, timeWindow: rateLimitWindowMs } }
  }, async (request, reply) => {
    if (!shopifyWebhooks) {
      return reply.code(503).send({ error: 'shopify_webhooks_unavailable' })
    }

    try {
      await shopifyWebhooks.handle({
        rawBody: request.rawBody,
        headers: request.headers
      })
      return reply.code(200).send({ received: true })
    } catch (error) {
      if (error.message === 'invalid_shopify_webhook_hmac') {
        return reply.code(401).send({ error: error.message })
      }
      if (error.message.startsWith('invalid_shopify_webhook_')) {
        return reply.code(400).send({ error: error.message })
      }
      app.log.error({ err: error }, 'Shopify webhook processing failed')
      return reply.code(500).send({ error: 'shopify_webhook_processing_failed' })
    }
  })

  app.post('/api/stripe/webhooks', {
    config: { rateLimit: { max: 1000, timeWindow: rateLimitWindowMs } }
  }, async (request, reply) => {
    if (!stripeBilling) {
      return reply.code(503).send({ error: 'stripe_billing_unavailable' })
    }

    try {
      const result = await stripeBilling.handleWebhook({
        rawBody: request.rawBody,
        signature: request.headers['stripe-signature']
      })
      return reply.code(200).send({ received: true, ...result })
    } catch (error) {
      if (['invalid_stripe_webhook_request', 'invalid_stripe_webhook_signature'].includes(error.message)) {
        return reply.code(400).send({ error: error.message })
      }
      app.log.error({ err: error }, 'Stripe webhook processing failed')
      return reply.code(500).send({ error: 'stripe_webhook_processing_failed' })
    }
  })

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

  async function platformAdmin(request, reply) {
    const user = await authenticatedUser(request, reply)
    if (!user?.id) return null
    try {
      return await authorizePlatformAdmin({ database, user })
    } catch (error) {
      if (error.message === 'platform_admin_mfa_required') {
        reply.header('x-auth-required-aal', 'aal2')
        return reply.code(403).send({ error: error.message })
      }
      if (error.message === 'platform_admin_access_denied') {
        return reply.code(403).send({ error: error.message })
      }
      throw error
    }
  }

  app.get('/api/admin/session', async (request, reply) => {
    try {
      const admin = await platformAdmin(request, reply)
      if (!admin?.userId) return
      return { admin }
    } catch (error) {
      app.log.error({ err: error }, 'Platform admin session lookup failed')
      return reply.code(503).send({ error: 'platform_admin_unavailable' })
    }
  })

  app.get('/api/admin/overview', async (request, reply) => {
    try {
      const admin = await platformAdmin(request, reply)
      if (!admin?.userId) return
      return { overview: await readPlatformOverview({ database }) }
    } catch (error) {
      app.log.error({ err: error }, 'Platform overview lookup failed')
      return reply.code(503).send({ error: 'platform_overview_unavailable' })
    }
  })

  app.get('/api/admin/workspaces', async (request, reply) => {
    try {
      const admin = await platformAdmin(request, reply)
      if (!admin?.userId) return
      return {
        workspaces: await listPlatformWorkspaces({
          database, page: request.query?.page, pageSize: request.query?.pageSize
        })
      }
    } catch (error) {
      app.log.error({ err: error }, 'Platform workspace listing failed')
      return reply.code(503).send({ error: 'platform_workspaces_unavailable' })
    }
  })

  app.get('/api/admin/stores', async (request, reply) => {
    try {
      const admin = await platformAdmin(request, reply)
      if (!admin?.userId) return
      return { stores: await listPlatformStores({
        database, page: request.query?.page, pageSize: request.query?.pageSize
      }) }
    } catch (error) {
      app.log.error({ err: error }, 'Platform store listing failed')
      return reply.code(503).send({ error: 'platform_stores_unavailable' })
    }
  })

  app.get('/api/admin/stores/:storeId', async (request, reply) => {
    try {
      const admin = await platformAdmin(request, reply); if (!admin?.userId) return
      const store = await readPlatformStore({ database, storeId: request.params.storeId })
      return store ? { store } : reply.code(404).send({ error: 'platform_store_not_found' })
    } catch (error) {
      if (error.message === 'invalid_store_id') return reply.code(400).send({ error: error.message })
      app.log.error({ err: error }, 'Platform store detail failed')
      return reply.code(503).send({ error: 'platform_store_unavailable' })
    }
  })

  app.get('/api/admin/operations', async (request, reply) => {
    try {
      const admin = await platformAdmin(request, reply); if (!admin?.userId) return
      return { operations: await listPlatformOperations({ database, limit: request.query?.limit }) }
    } catch (error) {
      app.log.error({ err:error }, 'Platform operations listing failed')
      return reply.code(503).send({ error:'platform_operations_unavailable' })
    }
  })

  app.get('/api/admin/catalog',async(request,reply)=>{try{const admin=await platformAdmin(request,reply);if(!admin?.userId)return;return{catalog:await readPlatformCatalog({database})}}catch(error){app.log.error({err:error},'Platform catalog failed');return reply.code(503).send({error:'platform_catalog_unavailable'})}})
  app.patch('/api/admin/catalog/:kind/:id/active',async(request,reply)=>{try{const admin=await platformAdmin(request,reply);if(!admin?.userId)return;return{item:await setPlatformCatalogActive({database,admin,kind:request.params.kind,id:request.params.id,active:request.body?.active,reason:request.body?.reason})}}catch(error){if(error.message==='platform_admin_write_denied')return reply.code(403).send({error:error.message});if(error.message==='invalid_catalog_change')return reply.code(400).send({error:error.message});if(error.message==='catalog_item_not_found')return reply.code(404).send({error:error.message});app.log.error({err:error},'Platform catalog update failed');return reply.code(503).send({error:'platform_catalog_unavailable'})}})
  app.patch('/api/admin/stores/:storeId/storefront-status',async(request,reply)=>{try{const admin=await platformAdmin(request,reply);if(!admin?.userId)return;return{storefront:await setPlatformStorefrontStatus({database,admin,storeId:request.params.storeId,status:request.body?.status,reason:request.body?.reason,confirmation:request.body?.confirmation})}}catch(error){if(error.message==='platform_admin_write_denied')return reply.code(403).send({error:error.message});if(['invalid_storefront_status_change','storefront_confirmation_mismatch'].includes(error.message))return reply.code(400).send({error:error.message});if(error.message==='platform_store_not_found')return reply.code(404).send({error:error.message});app.log.error({err:error},'Platform storefront status update failed');return reply.code(503).send({error:'platform_storefront_update_unavailable'})}})

  function sendStorefrontAssetError(error, reply) {
    if (error.statusCode === 413 || error.message === 'asset_too_large') {
      return reply.code(413).send({ error: 'asset_too_large', details: error.details || null })
    }
    if (['storefront_access_denied', 'storefront_write_denied'].includes(error.message)) {
      return reply.code(403).send({ error: error.message })
    }
    if ([
      'invalid_asset_file',
      'invalid_asset_path',
      'invalid_asset_purpose',
      'invalid_asset_type',
      'invalid_asset_dimensions'
    ].includes(error.message)) {
      return reply.code(400).send({ error: error.message, details: error.details || null })
    }
    if (error.message === 'storefront_asset_quota_exceeded') {
      return reply.code(409).send({ error: error.message, details: error.details })
    }
    app.log.error({ err: error }, 'Storefront asset operation failed')
    return reply.code(503).send({ error: 'storefront_asset_storage_failed' })
  }

  app.post('/api/auth/handoff', {
    config: { rateLimit: { max: 20, timeWindow: rateLimitWindowMs } }
  }, async (request, reply) => {
    if (!authHandoff) return reply.code(503).send({ error: 'auth_handoff_unavailable' })
    try {
      const accessToken = readBearerToken(request.headers.authorization)
      const user = await authenticatedUser(request, reply)
      if (!user?.id) return
      const result = await authHandoff.issue({
        userId: user.id,
        accessToken,
        refreshToken: request.body?.refreshToken,
        returnPath: request.body?.returnPath
      })
      return reply.code(201).send(result)
    } catch (error) {
      if (['invalid_auth_handoff_session', 'invalid_auth_handoff_return_path'].includes(error.message)) {
        return reply.code(400).send({ error: error.message })
      }
      app.log.error({ err: error }, 'Customer auth handoff creation failed')
      return reply.code(503).send({ error: 'auth_handoff_unavailable' })
    }
  })

  app.post('/api/auth/handoff/exchange', {
    config: { rateLimit: { max: 20, timeWindow: rateLimitWindowMs } }
  }, async (request, reply) => {
    if (!authHandoff) return reply.code(503).send({ error: 'auth_handoff_unavailable' })
    try {
      return await authHandoff.exchange({ code: request.body?.code })
    } catch (error) {
      if (['invalid_auth_handoff_code', 'invalid_or_expired_auth_handoff'].includes(error.message)) {
        return reply.code(400).send({ error: error.message })
      }
      app.log.error({ err: error }, 'Customer auth handoff exchange failed')
      return reply.code(503).send({ error: 'auth_handoff_unavailable' })
    }
  })

  app.post('/api/storefronts/:storefrontId/assets/:purpose', {
    bodyLimit: maxStorefrontAssetRequestBytes
  }, async (request, reply) => {
    if (!storefrontAssets) {
      return reply.code(503).send({ error: 'storefront_assets_unavailable' })
    }
    try {
      const accessToken = readBearerToken(request.headers.authorization)
      const user = await authenticatedUser(request, reply)
      if (!user?.id) return
      if (!request.isMultipart()) {
        return reply.code(415).send({ error: 'multipart_required' })
      }
      const file = await request.file()
      if (!file || file.fieldname !== 'file') {
        return reply.code(400).send({ error: 'invalid_asset_file' })
      }
      const buffer = await file.toBuffer()
      const result = await storefrontAssets.upload({
        userId: user.id,
        accessToken,
        storefrontId: request.params.storefrontId,
        purpose: request.params.purpose,
        claimedMimeType: file.mimetype,
        buffer
      })
      return reply.code(201).send(result)
    } catch (error) {
      return sendStorefrontAssetError(error, reply)
    }
  })

  app.delete('/api/storefronts/:storefrontId/assets', async (request, reply) => {
    if (!storefrontAssets) {
      return reply.code(503).send({ error: 'storefront_assets_unavailable' })
    }
    try {
      const accessToken = readBearerToken(request.headers.authorization)
      const user = await authenticatedUser(request, reply)
      if (!user?.id) return
      return await storefrontAssets.remove({
        userId: user.id,
        accessToken,
        storefrontId: request.params.storefrontId,
        path: request.body?.path
      })
    } catch (error) {
      return sendStorefrontAssetError(error, reply)
    }
  })

  app.get('/api/storefronts/:storefrontId/onboarding', async (request, reply) => {
    try {
      const user = await authenticatedUser(request, reply)
      if (!user?.id) return
      const result = await readOnboarding({
        database, userId: user.id, storefrontId: request.params.storefrontId
      })
      if (!result) return reply.code(404).send({ error: 'storefront_not_found' })
      return {
        ...result,
        billing: {
          provider: billingProvider,
          mock: billingProvider === 'mock'
        }
      }
    } catch (error) {
      app.log.error({ err: error }, 'Onboarding lookup failed')
      return reply.code(503).send({ error: 'onboarding_unavailable' })
    }
  })

  app.patch('/api/storefronts/:storefrontId/onboarding/niche', async (request, reply) => {
    try {
      const user = await authenticatedUser(request, reply)
      if (!user?.id) return
      if (!request.body?.nicheId) return reply.code(400).send({ error: 'invalid_niche' })
      return await selectNiche({
        database, userId: user.id, storefrontId: request.params.storefrontId,
        nicheId: request.body.nicheId
      })
    } catch (error) {
      if (error.message === 'storefront_access_denied') {
        return reply.code(403).send({ error: error.message })
      }
      if (error.message === 'invalid_niche') {
        return reply.code(400).send({ error: error.message })
      }
      app.log.error({ err: error }, 'Niche selection failed')
      return reply.code(503).send({ error: 'onboarding_update_failed' })
    }
  })

  app.patch('/api/storefronts/:storefrontId/onboarding/banner', async (request, reply) => {
    try {
      const user = await authenticatedUser(request, reply)
      if (!user?.id) return
      if (!request.body?.bannerPresetId) return reply.code(400).send({ error: 'invalid_banner_preset' })
      return await selectBannerPreset({ database, userId: user.id,
        storefrontId: request.params.storefrontId, bannerPresetId: request.body.bannerPresetId })
    } catch (error) {
      if (error.message === 'storefront_access_denied') return reply.code(403).send({ error: error.message })
      if (error.message === 'invalid_banner_preset') return reply.code(400).send({ error: error.message })
      app.log.error({ err: error }, 'Banner preset selection failed')
      return reply.code(503).send({ error: 'onboarding_update_failed' })
    }
  })

  app.patch('/api/storefronts/:storefrontId/onboarding/brand', async (request, reply) => {
    try {
      const user = await authenticatedUser(request, reply)
      if (!user?.id) return
      await saveDesignDraft({
        database,
        userId: user.id,
        storefrontId: request.params.storefrontId,
        settings: request.body
      })
      await publishDesignConfig({
        database,
        userId: user.id,
        storefrontId: request.params.storefrontId
      })
      return await completeBrandSetup({
        database, userId: user.id, storefrontId: request.params.storefrontId
      })
    } catch (error) {
      if (error.message === 'invalid_design_settings') {
        return reply.code(400).send({ error: error.message })
      }
      if (['storefront_access_denied', 'storefront_write_denied'].includes(error.message)) {
        return reply.code(403).send({ error: error.message })
      }
      app.log.error({ err: error }, 'Brand setup failed')
      return reply.code(503).send({ error: 'onboarding_update_failed' })
    }
  })

  app.patch('/api/storefronts/:storefrontId/onboarding/preview', async (request, reply) => {
    try {
      const user = await authenticatedUser(request, reply)
      if (!user?.id) return
      return await completeStorePreview({
        database, userId: user.id, storefrontId: request.params.storefrontId
      })
    } catch (error) {
      if (error.message === 'storefront_access_denied') {
        return reply.code(403).send({ error: error.message })
      }
      app.log.error({ err: error }, 'Store preview completion failed')
      return reply.code(503).send({ error: 'onboarding_update_failed' })
    }
  })

  app.post('/api/storefronts/:storefrontId/onboarding/products/check', async (request, reply) => {
    if (!productReadiness) {
      return reply.code(503).send({ error: 'product_readiness_unavailable' })
    }
    try {
      const user = await authenticatedUser(request, reply)
      if (!user?.id) return
      return await productReadiness.check({
        userId: user.id,
        storefrontId: request.params.storefrontId
      })
    } catch (error) {
      if (error.message === 'storefront_access_denied') {
        return reply.code(403).send({ error: error.message })
      }
      if (error.message === 'shopify_product_check_failed') {
        return reply.code(503).send({ error: error.message })
      }
      app.log.error({ err: error }, 'Product readiness check failed')
      return reply.code(503).send({ error: 'product_readiness_unavailable' })
    }
  })

  app.patch('/api/storefronts/:storefrontId/onboarding/domain/skip', async (request, reply) => {
    try {
      const user = await authenticatedUser(request, reply)
      if (!user?.id) return
      return await skipDomainSetup({
        database, userId: user.id, storefrontId: request.params.storefrontId
      })
    } catch (error) {
      if (error.message === 'storefront_access_denied') {
        return reply.code(403).send({ error: error.message })
      }
      app.log.error({ err: error }, 'Domain setup skip failed')
      return reply.code(503).send({ error: 'onboarding_update_failed' })
    }
  })

  app.patch('/api/storefronts/:storefrontId/onboarding/plan', async (request, reply) => {
    try {
      const user = await authenticatedUser(request, reply)
      if (!user?.id) return
      const planKey = String(request.body?.planKey || '')
      if (!planKey) return reply.code(400).send({ error: 'invalid_store_plan' })
      return await selectStorePlan({
        database,
        userId: user.id,
        storefrontId: request.params.storefrontId,
        planKey
      })
    } catch (error) {
      if (['storefront_access_denied', 'storefront_billing_denied'].includes(error.message)) {
        return reply.code(403).send({ error: error.message })
      }
      if (error.message === 'invalid_store_plan') {
        return reply.code(400).send({ error: error.message })
      }
      app.log.error({ err: error }, 'Store plan selection failed')
      return reply.code(503).send({ error: 'onboarding_update_failed' })
    }
  })

  app.post('/api/storefronts/:storefrontId/billing/checkout', async (request, reply) => {
    if (!stripeBilling) {
      return reply.code(503).send({ error: 'stripe_billing_unavailable' })
    }
    try {
      const user = await authenticatedUser(request, reply)
      if (!user?.id) return
      return await stripeBilling.createCheckout({
        userId: user.id,
        userEmail: user.email || null,
        storefrontId: request.params.storefrontId
      })
    } catch (error) {
      if (['storefront_access_denied', 'storefront_billing_denied'].includes(error.message)) {
        return reply.code(403).send({ error: error.message })
      }
      if ([
        'store_plan_not_selected',
        'store_subscription_already_active',
        'store_subscription_requires_management'
      ].includes(error.message)) {
        return reply.code(409).send({ error: error.message })
      }
      if (['store_plan_price_unavailable', 'store_plan_price_mismatch'].includes(error.message)) {
        return reply.code(503).send({ error: error.message })
      }
      app.log.error({ err: error }, 'Stripe Checkout creation failed')
      return reply.code(503).send({ error: 'stripe_checkout_failed' })
    }
  })

  if (mockBilling) {
    app.post('/api/storefronts/:storefrontId/billing/mock', async (request, reply) => {
      try {
        const user = await authenticatedUser(request, reply)
        if (!user?.id) return
        return await mockBilling.simulate({
          userId: user.id,
          storefrontId: request.params.storefrontId,
          action: String(request.body?.action || '')
        })
      } catch (error) {
        if (['storefront_access_denied', 'storefront_billing_denied'].includes(error.message)) {
          return reply.code(403).send({ error: error.message })
        }
        if (error.message === 'invalid_mock_billing_action') {
          return reply.code(400).send({ error: error.message })
        }
        if (error.message === 'store_plan_not_selected') {
          return reply.code(409).send({ error: error.message })
        }
        app.log.error({ err: error }, 'Mock billing simulation failed')
        return reply.code(503).send({ error: 'mock_billing_failed' })
      }
    })
  }

  app.post('/api/storefronts/:storefrontId/billing/portal', async (request, reply) => {
    if (!stripeBilling) {
      return reply.code(503).send({ error: 'stripe_billing_unavailable' })
    }
    try {
      const user = await authenticatedUser(request, reply)
      if (!user?.id) return
      return await stripeBilling.createPortal({
        userId: user.id,
        storefrontId: request.params.storefrontId
      })
    } catch (error) {
      if (['storefront_access_denied', 'storefront_billing_denied'].includes(error.message)) {
        return reply.code(403).send({ error: error.message })
      }
      if (error.message === 'stripe_customer_unavailable') {
        return reply.code(409).send({ error: error.message })
      }
      app.log.error({ err: error }, 'Stripe customer portal creation failed')
      return reply.code(503).send({ error: 'stripe_portal_failed' })
    }
  })

  app.post('/api/storefronts/:storefrontId/onboarding/complete', async (request, reply) => {
    try {
      const user = await authenticatedUser(request, reply)
      if (!user?.id) return
      return await completeOnboarding({
        database, userId: user.id, storefrontId: request.params.storefrontId
      })
    } catch (error) {
      if (error.message === 'storefront_access_denied') {
        return reply.code(403).send({ error: error.message })
      }
      if (error.message === 'onboarding_incomplete') {
        return reply.code(409).send({
          error: error.message,
          missingSteps: error.missingSteps
        })
      }
      if (error.message === 'store_subscription_inactive') {
        return reply.code(409).send({ error: error.message })
      }
      app.log.error({ err: error }, 'Onboarding completion failed')
      return reply.code(503).send({ error: 'onboarding_update_failed' })
    }
  })

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

  app.post('/api/storefronts/:storefrontId/preview', async (request, reply) => {
    if (!storefrontPreview) return reply.code(503).send({ error: 'storefront_preview_unavailable' })
    try {
      const user = await authenticatedUser(request, reply)
      if (!user?.id) return
      return await storefrontPreview.issue({
        userId: user.id,
        storefrontId: request.params.storefrontId
      })
    } catch (error) {
      if (error.message === 'storefront_access_denied') {
        return reply.code(403).send({ error: error.message })
      }
      app.log.error({ err: error }, 'Storefront preview creation failed')
      return reply.code(503).send({ error: 'storefront_preview_unavailable' })
    }
  })

  app.get('/api/storefronts/:storefrontId/config-versions', async (request, reply) => {
    try {
      const user = await authenticatedUser(request, reply)
      if (!user?.id) return
      const versions = await listCmsConfigVersions({
          database,
          userId: user.id,
          storefrontId: request.params.storefrontId,
          limit: request.query?.limit
        })
      if (!versions) return reply.code(404).send({ error: 'storefront_not_found' })
      return { versions }
    } catch (error) {
      app.log.error({ err: error }, 'Storefront configuration history lookup failed')
      return reply.code(503).send({ error: 'storefront_config_history_unavailable' })
    }
  })

  app.post('/api/storefronts/:storefrontId/config-versions/:version/restore', async (request, reply) => {
    try {
      const user = await authenticatedUser(request, reply)
      if (!user?.id) return
      return await restoreCmsConfigVersion({
        database,
        userId: user.id,
        storefrontId: request.params.storefrontId,
        version: request.params.version
      })
    } catch (error) {
      if (['storefront_access_denied', 'storefront_write_denied'].includes(error.message)) {
        return reply.code(403).send({ error: error.message })
      }
      if (error.message === 'invalid_config_version') {
        return reply.code(400).send({ error: error.message })
      }
      if (error.message === 'storefront_config_version_not_found') {
        return reply.code(404).send({ error: error.message })
      }
      app.log.error({ err: error }, 'Storefront configuration restore failed')
      return reply.code(503).send({ error: 'storefront_config_restore_unavailable' })
    }
  })

  app.put('/api/storefronts/:storefrontId/design', async (request, reply) => {
    try {
      const user = await authenticatedUser(request, reply)
      if (!user?.id) return
      return await saveDesignDraft({
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
      app.log.error({ err: error }, 'Design draft save failed')
      return reply.code(503).send({ error: 'design_config_unavailable' })
    }
  })

  app.post('/api/storefronts/:storefrontId/design/publish', async (request, reply) => {
    try {
      const user = await authenticatedUser(request, reply)
      if (!user?.id) return
      return await publishDesignConfig({
        database, userId: user.id, storefrontId: request.params.storefrontId
      })
    } catch (error) {
      if (error.message === 'invalid_design_settings') {
        return reply.code(400).send({ error: 'invalid_design_settings' })
      }
      if (['storefront_access_denied', 'storefront_write_denied'].includes(error.message)) {
        return reply.code(403).send({ error: error.message })
      }
      if (error.message === 'storefront_no_draft_changes') {
        return reply.code(409).send({ error: error.message })
      }
      app.log.error({ err: error }, 'Design draft publish failed')
      return reply.code(503).send({ error: 'design_config_unavailable' })
    }
  })

  app.get('/api/storefronts/:storefrontId/content', async (request, reply) => {
    try {
      const user = await authenticatedUser(request, reply)
      if (!user?.id) return
      const config = await readContentConfig({
        database, userId: user.id, storefrontId: request.params.storefrontId
      })
      if (!config) return reply.code(404).send({ error: 'storefront_not_found' })
      return config
    } catch (error) {
      app.log.error({ err: error }, 'Content configuration lookup failed')
      return reply.code(503).send({ error: 'content_config_unavailable' })
    }
  })

  app.put('/api/storefronts/:storefrontId/content', async (request, reply) => {
    try {
      const user = await authenticatedUser(request, reply)
      if (!user?.id) return
      return await saveContentDraft({
        database, userId: user.id, storefrontId: request.params.storefrontId,
        settings: request.body
      })
    } catch (error) {
      if (error.message === 'invalid_content_settings') {
        return reply.code(400).send({ error: 'invalid_content_settings' })
      }
      if (['storefront_access_denied', 'storefront_write_denied'].includes(error.message)) {
        return reply.code(403).send({ error: error.message })
      }
      app.log.error({ err: error }, 'Content draft save failed')
      return reply.code(503).send({ error: 'content_config_unavailable' })
    }
  })

  app.post('/api/storefronts/:storefrontId/content/publish', async (request, reply) => {
    try {
      const user = await authenticatedUser(request, reply)
      if (!user?.id) return
      return await publishContentConfig({
        database, userId: user.id, storefrontId: request.params.storefrontId
      })
    } catch (error) {
      if (error.message === 'invalid_content_settings') {
        return reply.code(400).send({ error: 'invalid_content_settings' })
      }
      if (['storefront_access_denied', 'storefront_write_denied'].includes(error.message)) {
        return reply.code(403).send({ error: error.message })
      }
      if (error.message === 'storefront_no_draft_changes') {
        return reply.code(409).send({ error: error.message })
      }
      app.log.error({ err: error }, 'Content draft publish failed')
      return reply.code(503).send({ error: 'content_config_unavailable' })
    }
  })

  app.get('/api/storefronts/:storefrontId/domains', async (request, reply) => {
    if (!shopifyDomains) return reply.code(503).send({ error: 'domain_service_unavailable' })
    try {
      const user = await authenticatedUser(request, reply)
      if (!user?.id) return
      const result = await shopifyDomains.read({
        userId: user.id,
        storefrontId: request.params.storefrontId
      })
      if (!result) return reply.code(404).send({ error: 'storefront_not_found' })
      return result
    } catch (error) {
      app.log.error({ err: error }, 'Domain configuration lookup failed')
      return reply.code(503).send({ error: 'domain_lookup_failed' })
    }
  })

  app.post('/api/storefronts/:storefrontId/domains/sync', async (request, reply) => {
    if (!shopifyDomains) return reply.code(503).send({ error: 'domain_service_unavailable' })
    try {
      const user = await authenticatedUser(request, reply)
      if (!user?.id) return
      const domains = await shopifyDomains.sync({
        userId: user.id,
        storefrontId: request.params.storefrontId
      })
      const domainSetup = await completeDomainSetup({
        database,
        userId: user.id,
        storefrontId: request.params.storefrontId
      })
      return { ...domains, domainSetup }
    } catch (error) {
      if (['storefront_access_denied', 'storefront_write_denied'].includes(error.message)) {
        return reply.code(403).send({ error: error.message })
      }
      if (error.message === 'domain_already_claimed') {
        return reply.code(409).send({ error: error.message })
      }
      if (error.message === 'invalid_encrypted_token') {
        return reply.code(409).send({ error: 'shopify_reconnect_required' })
      }
      app.log.error({ err: error }, 'Shopify domain synchronization failed')
      return reply.code(503).send({ error: 'domain_sync_failed' })
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
      let authorizationUrl
      if (request.body?.shop) {
        authorizationUrl = await shopifyOAuth.begin({
          user,
          workspaceId: request.body?.workspaceId,
          shop: request.body.shop
        })
      } else {
        const selection = await shopifyOAuth.beginStoreSelection({
          user,
          workspaceId: request.body?.workspaceId
        })
        authorizationUrl = selection.redirectUrl
        reply.header(
          'set-cookie',
          `${installIntentCookie}=${encodeURIComponent(selection.nonce)}; Max-Age=600; Path=/api/shopify; HttpOnly; Secure; SameSite=Lax`
        )
      }
      return { authorizationUrl }
    } catch (error) {
      if (error.message === 'invalid_shop_domain') {
        return reply.code(400).send({ error: 'invalid_shop_domain' })
      }
      if (error.message === 'workspace_access_denied') {
        return reply.code(403).send({ error: 'workspace_access_denied' })
      }
      if (error.message === 'shopify_install_url_missing') {
        return reply.code(503).send({ error: 'shopify_install_url_missing' })
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

  async function handleShopifyInstall(request, reply) {
    if (!shopifyOAuth) {
      return reply.code(503).send({ error: 'shopify_oauth_unavailable' })
    }

    const nonce = readCookie(request.headers.cookie, installIntentCookie)
    if (!nonce || !request.query?.shop) {
      return reply.redirect(shopifyOAuth.installRedirect(request.query?.shop))
    }

    try {
      const authorizationUrl = await shopifyOAuth.continueStoreSelection({
        shop: request.query.shop,
        nonce
      })
      return reply.redirect(authorizationUrl)
    } catch (error) {
      app.log.error({ err: error }, 'Shopify store selection continuation failed')
      return reply.redirect(shopifyOAuth.installRedirect(request.query?.shop))
    }
  }

  app.get('/', handleShopifyInstall)
  app.get('/api/shopify/install', handleShopifyInstall)

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
    const previewAuthorization = String(request.headers.authorization || '')
    let previewClaims = null

    if (previewAuthorization.startsWith('StorefrontPreview ')) {
      if (!storefrontPreview) return reply.code(401).send({ error: 'invalid_storefront_preview_token' })
      try {
        previewClaims = storefrontPreview.verify(previewAuthorization.slice('StorefrontPreview '.length))
      } catch {
        return reply.code(401).send({ error: 'invalid_storefront_preview_token' })
      }
    }

    if (requestedOverride && !allowStorefrontHostOverride && !previewClaims) {
      return reply.code(400).send({
        error: 'storefront_host_override_disabled'
      })
    }

    let hostname
    try {
      hostname = normalizeStorefrontHostname(
        previewClaims?.hostname || requestedOverride || request.hostname
      )
    } catch {
      return reply.code(400).send({ error: 'invalid_storefront_hostname' })
    }
    if (
      previewClaims && requestedOverride &&
      normalizeStorefrontHostname(requestedOverride) !== hostname
    ) {
      return reply.code(403).send({ error: 'storefront_preview_scope_mismatch' })
    }

    try {
      const config = await findStorefrontRuntimeConfig({
        database,
        hostname,
        shopifyApiVersion,
        previewStorefrontId: previewClaims?.storefrontId || null
      })

      if (!config) {
        return reply.code(404).send({ error: 'storefront_not_found' })
      }

      // CMS changes must be visible on the very next storefront load. A CDN can
      // add version-aware caching later; browser-level stale caching is unsafe here.
      reply.header('cache-control', 'no-store, no-cache, must-revalidate')
      if (previewClaims) config.preview.expiresAt = new Date(previewClaims.exp * 1000).toISOString()
      return config
    } catch (error) {
      app.log.error({ err: error, hostname }, 'Storefront configuration lookup failed')
      return reply.code(503).send({ error: 'storefront_config_unavailable' })
    }
  })

  })

  return app
}
