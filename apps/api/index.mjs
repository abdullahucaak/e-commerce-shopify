import pg from 'pg'
import Fastify from 'fastify'
import { buildApp, buildFastifyOptions } from './server/app.mjs'
import { createSupabaseAccessTokenVerifier } from './server/auth.mjs'
import { loadServerConfig } from './server/config/env.mjs'
import { createShopifyOAuthService } from './server/shopify-oauth.mjs'
import { createShopifyDomainService } from './server/domain-sync.mjs'
import { createShopifyWebhookService } from './server/shopify-webhooks.mjs'
import { createStripeBillingService } from './server/stripe-billing.mjs'
import { createMockBillingService } from './server/mock-billing.mjs'
import { createShopifyAppPricingService } from './server/shopify-app-pricing.mjs'
import { createProductReadinessService } from './server/product-readiness.mjs'
import { createAuthHandoffService } from './server/auth-handoff.mjs'
import { createSupabaseStorageGateway } from './server/supabase-storage.mjs'
import { createStorefrontAssetService } from './server/storefront-assets.mjs'
import { createStorefrontPreviewService } from './server/storefront-preview.mjs'
import { createShopDataRedactor } from './server/shop-data-redaction.mjs'

const { Pool } = pg
const config = loadServerConfig()
const app = Fastify(buildFastifyOptions({
  trustProxy: config.trustProxy,
  requestBodyLimitBytes: config.requestBodyLimitBytes
}))
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
  encryptionSecret: config.shopifyTokenEncryptionSecret,
  clientId: config.shopifyClientId,
  clientSecret: config.shopifyClientSecret
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
const shopifyAppPricing = config.shopifyAppPricingEnabled
  ? createShopifyAppPricingService({
    database: pool,
    organizationId: config.shopifyPartnerOrganizationId,
    appId: config.shopifyAppGid,
    appHandle: config.shopifyAppHandle,
    accessToken: config.shopifyPartnerApiAccessToken,
    yourProStoreUrl: config.yourProStoreAppUrl,
    apiVersion: config.shopifyApiVersion
  })
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

buildApp({
  database: pool,
  fastifyInstance: app,
  verifyAccessToken,
  shopifyOAuth,
  shopifyDomains,
  shopifyWebhooks,
  stripeBilling,
  mockBilling,
  shopifyAppPricing,
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

if (process.env.VERCEL) {
  // Keep this call identical to Vercel's Fastify entrypoint contract so its
  // build adapter can replace the listener with a serverless request handler.
  app.listen({ port: 3000 })
} else {
  app.listen({ port: config.port, host: config.host }).catch(async error => {
    app.log.error(error)
    await pool.end()
    process.exit(1)
  })
}
