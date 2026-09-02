function required(name) {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`${name} is required.`)
  }

  return value
}

function positiveInteger(name, fallback) {
  const value = Number(process.env[name] || fallback)
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer.`)
  }
  return value
}

export function resolveBillingProvider({ nodeEnv, requestedProvider, stripeConfigured }) {
  const provider = requestedProvider?.trim().toLowerCase() ||
    (stripeConfigured ? 'stripe' : 'disabled')

  if (!['disabled', 'mock', 'stripe'].includes(provider)) {
    throw new Error('BILLING_PROVIDER must be disabled, mock or stripe.')
  }
  if (provider === 'mock' && nodeEnv === 'production') {
    throw new Error('BILLING_PROVIDER=mock is forbidden in production.')
  }
  if (provider === 'stripe' && !stripeConfigured) {
    throw new Error('Stripe billing requires all Stripe environment variables.')
  }
  return provider
}

export function loadServerConfig() {
  const port = Number(process.env.PORT || 3000)
  const nodeEnv = process.env.NODE_ENV?.trim() || 'development'
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim() || null
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() || null
  const stripeStarterMonthlyPriceId =
    process.env.STRIPE_STARTER_MONTHLY_PRICE_ID?.trim() || null

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port.')
  }

  const stripeValues = [stripeSecretKey, stripeWebhookSecret, stripeStarterMonthlyPriceId]
  if (stripeValues.some(Boolean) && !stripeValues.every(Boolean)) {
    throw new Error(
      'STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET and STRIPE_STARTER_MONTHLY_PRICE_ID must be configured together.'
    )
  }
  const stripeConfigured = stripeValues.every(Boolean)
  const billingProvider = resolveBillingProvider({
    nodeEnv,
    requestedProvider: process.env.BILLING_PROVIDER,
    stripeConfigured
  })
  const storefrontAdminAppUrl =
    process.env.STOREFRONT_ADMIN_APP_URL?.trim() ||
    process.env.VITE_STOREFRONT_ADMIN_URL?.trim() ||
    'http://127.0.0.1:5174/'

  return {
    port,
    host: process.env.API_HOST?.trim() || '127.0.0.1',
    databaseUrl: required('DATABASE_URL'),
    supabaseUrl:
      process.env.SUPABASE_URL?.trim() || required('VITE_SUPABASE_URL'),
    supabasePublishableKey:
      process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
      required('VITE_SUPABASE_PUBLISHABLE_KEY'),
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null,
    shopifyClientId: required('SHOPIFY_CLIENT_ID'),
    shopifyClientSecret: required('SHOPIFY_CLIENT_SECRET'),
    shopifyPreviousClientSecret:
      process.env.SHOPIFY_PREVIOUS_CLIENT_SECRET?.trim() || null,
    shopifyAppUrl: required('SHOPIFY_APP_URL'),
    shopifyInstallUrl: process.env.SHOPIFY_INSTALL_URL?.trim() || null,
    yourProStoreAppUrl:
      process.env.YOURPROSTORE_AI_APP_URL?.trim() ||
      process.env.CUSTOMER_PLATFORM_APP_URL?.trim() ||
      required('PLATFORM_APP_URL'),
    shopifyTokenEncryptionSecret:
      process.env.SHOPIFY_TOKEN_ENCRYPTION_KEY?.trim() ||
      required('SHOPIFY_CLIENT_SECRET'),
    authHandoffEncryptionSecret:
      process.env.AUTH_HANDOFF_ENCRYPTION_KEY?.trim() ||
      process.env.SHOPIFY_TOKEN_ENCRYPTION_KEY?.trim() ||
      required('SHOPIFY_CLIENT_SECRET'),
    storefrontPreviewSigningSecret:
      process.env.STOREFRONT_PREVIEW_SIGNING_KEY?.trim() ||
      process.env.AUTH_HANDOFF_ENCRYPTION_KEY?.trim() ||
      process.env.SHOPIFY_TOKEN_ENCRYPTION_KEY?.trim() ||
      required('SHOPIFY_CLIENT_SECRET'),
    storefrontAdminAppUrl,
    shopifyApiVersion: process.env.SHOPIFY_API_VERSION?.trim() || '2026-07',
    stripeSecretKey,
    stripeWebhookSecret,
    stripeStarterMonthlyPriceId,
    billingProvider,
    stripeBillingEnabled: billingProvider === 'stripe',
    mockBillingEnabled: billingProvider === 'mock',
    databaseSsl: process.env.DATABASE_SSL !== 'false',
    allowStorefrontHostOverride:
      process.env.ALLOW_STOREFRONT_HOST_OVERRIDE === 'true' ||
      nodeEnv !== 'production',
    trustProxy: process.env.TRUST_PROXY === 'true',
    requestBodyLimitBytes: positiveInteger('API_BODY_LIMIT_BYTES', 1024 * 1024),
    rateLimitMax: positiveInteger('API_RATE_LIMIT_MAX', 300),
    rateLimitWindowMs: positiveInteger('API_RATE_LIMIT_WINDOW_MS', 60 * 1000)
  }
}
