import pg from 'pg'
import { buildApp } from './app.mjs'
import { createSupabaseAccessTokenVerifier } from './auth.mjs'
import { loadServerConfig } from './config/env.mjs'
import { createShopifyOAuthService } from './shopify-oauth.mjs'
import { createShopifyDomainService } from './domain-sync.mjs'
import { createShopifyWebhookService } from './shopify-webhooks.mjs'

const { Pool } = pg
const config = loadServerConfig()
const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : false
})
const verifyAccessToken = createSupabaseAccessTokenVerifier({
  supabaseUrl: config.supabaseUrl,
  publishableKey: config.supabasePublishableKey
})
const shopifyOAuth = createShopifyOAuthService({
  database: pool,
  clientId: config.shopifyClientId,
  clientSecret: config.shopifyClientSecret,
  previousClientSecret: config.shopifyPreviousClientSecret,
  appUrl: config.shopifyAppUrl,
  installUrl: config.shopifyInstallUrl,
  platformUrl: config.platformAppUrl,
  apiVersion: config.shopifyApiVersion,
  tokenEncryptionSecret: config.shopifyTokenEncryptionSecret
})
const shopifyDomains = createShopifyDomainService({
  database: pool,
  apiVersion: config.shopifyApiVersion,
  encryptionSecret: config.shopifyTokenEncryptionSecret
})
const shopifyWebhooks = createShopifyWebhookService({
  database: pool,
  clientSecret: config.shopifyClientSecret,
  previousClientSecret: config.shopifyPreviousClientSecret,
  domainService: shopifyDomains
})

const app = buildApp({
  database: pool,
  verifyAccessToken,
  shopifyOAuth,
  shopifyDomains,
  shopifyWebhooks,
  shopifyApiVersion: config.shopifyApiVersion,
  allowStorefrontHostOverride: config.allowStorefrontHostOverride,
  trustProxy: config.trustProxy
})

const shutdown = async signal => {
  app.log.info({ signal }, 'Shutting down API')
  await app.close()
  await pool.end()
  process.exit(0)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

try {
  await app.listen({ port: config.port, host: config.host })
} catch (error) {
  app.log.error(error)
  await pool.end()
  process.exit(1)
}
