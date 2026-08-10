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

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port.')
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
    platformAppUrl: required('PLATFORM_APP_URL'),
    shopifyTokenEncryptionSecret:
      process.env.SHOPIFY_TOKEN_ENCRYPTION_KEY?.trim() ||
      required('SHOPIFY_CLIENT_SECRET'),
    shopifyApiVersion: process.env.SHOPIFY_API_VERSION?.trim() || '2026-07',
    databaseSsl: process.env.DATABASE_SSL !== 'false',
    allowStorefrontHostOverride:
      process.env.ALLOW_STOREFRONT_HOST_OVERRIDE === 'true' ||
      nodeEnv !== 'production',
    trustProxy: process.env.TRUST_PROXY === 'true'
  }
}
