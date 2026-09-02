import pg from 'pg'
import Fastify from 'fastify'
import { buildApp } from './server/app.mjs'
import { createSupabaseAccessTokenVerifier } from './server/auth.mjs'
import { loadServerConfig } from './server/config/env.mjs'
import { createShopifyOAuthService } from './server/shopify-oauth.mjs'
import { createShopifyDomainService } from './server/domain-sync.mjs'
import { createShopifyWebhookService } from './server/shopify-webhooks.mjs'
import { createStripeBillingService } from './server/stripe-billing.mjs'
import { createMockBillingService } from './server/mock-billing.mjs'
import { createProductReadinessService } from './server/product-readiness.mjs'
import { createAuthHandoffService } from './server/auth-handoff.mjs'
import { createSupabaseStorageGateway } from './server/supabase-storage.mjs'
import { createStorefrontAssetService } from './server/storefront-assets.mjs'
import { createStorefrontPreviewService } from './server/storefront-preview.mjs'
import { createShopDataRedactor } from './server/shop-data-redaction.mjs'

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
  yourProStoreUrl: config.yourProStoreAppUrl,
  apiVersion: config.shopifyApiVersion,
  tokenEncryptionSecret: config.shopifyTokenEncryptionSecret
})
const shopifyDomains = createShopifyDomainService({
  database: pool,
  apiVersion: config.shopifyApiVersion,
  encryptionSecret: config.shopifyTokenEncryptionSecret
})
const shopDataRedactor = createShopDataRedactor({
  database: pool,
  supabaseUrl: config.supabaseUrl,
  serviceRoleKey: config.supabaseServiceRoleKey
})
const shopifyWebhooks = createShopifyWebhookService({
  database: pool,
  clientSecret: config.shopifyClientSecret,
  previousClientSecret: config.shopifyPreviousClientSecret,
  domainService: shopifyDomains,
  shopDataRedactor
})
const stripeBilling = config.stripeBillingEnabled
  ? createStripeBillingService({
    database: pool,
    secretKey: config.stripeSecretKey,
    webhookSecret: config.stripeWebhookSecret,
    yourProStoreUrl: config.yourProStoreAppUrl,
    priceIds: {
      starter_monthly: config.stripeStarterMonthlyPriceId
    }
  })
  : null
const mockBilling = config.mockBillingEnabled
  ? createMockBillingService({ database: pool })
  : null
const productReadiness = createProductReadinessService({
  database: pool,
  apiVersion: config.shopifyApiVersion
})
const authHandoff = createAuthHandoffService({
  database: pool,
  encryptionSecret: config.authHandoffEncryptionSecret,
  storefrontAdminUrl: config.storefrontAdminAppUrl
})
const storefrontAssets = createStorefrontAssetService({
  database: pool,
  storageGateway: createSupabaseStorageGateway({
    supabaseUrl: config.supabaseUrl,
    publishableKey: config.supabasePublishableKey
  })
})
const storefrontPreview = createStorefrontPreviewService({
  database: pool,
  signingSecret: config.storefrontPreviewSigningSecret
})

const app = buildApp({
  database: pool,
  // Keep construction in Vercel's detected entrypoint while buildApp remains
  // responsible for registering the shared middleware and routes.
  fastifyFactory: options => Fastify(options),
  verifyAccessToken,
  shopifyOAuth,
  shopifyDomains,
  shopifyWebhooks,
  stripeBilling,
  mockBilling,
  productReadiness,
  authHandoff,
  storefrontAssets,
  storefrontPreview,
  billingProvider: config.billingProvider,
  shopifyApiVersion: config.shopifyApiVersion,
  allowStorefrontHostOverride: config.allowStorefrontHostOverride,
  trustProxy: config.trustProxy,
  requestBodyLimitBytes: config.requestBodyLimitBytes,
  rateLimitMax: config.rateLimitMax,
  rateLimitWindowMs: config.rateLimitWindowMs
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
