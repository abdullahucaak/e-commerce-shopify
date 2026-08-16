function required(name) {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`${name} is required.`)
  }

  return value
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

  return {
    port,
    host: process.env.API_HOST?.trim() || '127.0.0.1',
    databaseUrl: required('DATABASE_URL'),
    supabaseUrl:
      process.env.SUPABASE_URL?.trim() || required('VITE_SUPABASE_URL'),
    supabasePublishableKey:
      process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
      required('VITE_SUPABASE_PUBLISHABLE_KEY'),
    shopifyClientId: required('SHOPIFY_CLIENT_ID'),
    shopifyClientSecret: required('SHOPIFY_CLIENT_SECRET'),
    shopifyPreviousClientSecret:
      process.env.SHOPIFY_PREVIOUS_CLIENT_SECRET?.trim() || null,
    shopifyAppUrl: required('SHOPIFY_APP_URL'),
    shopifyInstallUrl: process.env.SHOPIFY_INSTALL_URL?.trim() || null,
    platformAppUrl:
      process.env.CUSTOMER_PLATFORM_APP_URL?.trim() || required('PLATFORM_APP_URL'),
    shopifyTokenEncryptionSecret:
      process.env.SHOPIFY_TOKEN_ENCRYPTION_KEY?.trim() ||
      required('SHOPIFY_CLIENT_SECRET'),
    shopifyApiVersion: process.env.SHOPIFY_API_VERSION?.trim() || '2026-07',
    stripeSecretKey,
    stripeWebhookSecret,
    stripeStarterMonthlyPriceId,
    stripeBillingEnabled: stripeValues.every(Boolean),
    databaseSsl: process.env.DATABASE_SSL !== 'false',
    allowStorefrontHostOverride:
      process.env.ALLOW_STOREFRONT_HOST_OVERRIDE === 'true' ||
      nodeEnv !== 'production',
    trustProxy: process.env.TRUST_PROXY === 'true'
  }
}
