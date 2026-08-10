const platformApiUrl = (import.meta.env.VITE_PLATFORM_API_URL || '')
  .trim()
  .replace(/\/$/, '')

let runtimeConfig = null
let runtimeConfigPromise = null

function getLegacyDevelopmentConfig() {
  const domain = import.meta.env.VITE_SHOPIFY_DOMAIN?.trim()
  const storefrontAccessToken = import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN?.trim()
  const apiVersion = import.meta.env.VITE_SHOPIFY_API_VERSION?.trim()

  if (!domain || !apiVersion) return null

  return {
    storefront: {
      id: 'local-development',
      hostname: window.location.hostname,
      name: import.meta.env.VITE_STOREFRONT_NAME?.trim() || 'GlowField',
      locale: 'en',
      currencyCode: 'USD',
      countryCode: import.meta.env.VITE_SHOPIFY_COUNTRY_CODE?.trim() || 'US'
    },
    shopify: {
      domain: domain.replace(/^https?:\/\//, '').replace(/\/$/, ''),
      apiVersion,
      storefrontAccessToken: storefrontAccessToken || null
    },
    design: {},
    config: { version: null, schemaVersion: 1 },
    release: { version: 'local-development', channel: 'stable' },
    features: {}
  }
}

function validateRuntimeConfig(config) {
  if (
    !config?.storefront?.id ||
    !config?.shopify?.domain ||
    !config?.shopify?.apiVersion ||
    typeof config.design !== 'object' ||
    Array.isArray(config.design)
  ) {
    throw new Error('Platform returned an invalid storefront configuration.')
  }

  return config
}

async function requestRuntimeConfig() {
  const endpoint = new URL(
    `${platformApiUrl}/api/storefront/config`,
    window.location.origin
  )
  const developmentHostname = import.meta.env.VITE_STOREFRONT_HOST?.trim()

  if (developmentHostname) {
    endpoint.searchParams.set('host', developmentHostname)
  }

  try {
    const response = await fetch(endpoint, {
      headers: { Accept: 'application/json' }
    })

    if (!response.ok) {
      throw new Error(`Storefront configuration request failed (${response.status}).`)
    }

    return validateRuntimeConfig(await response.json())
  } catch (error) {
    const legacyConfig = import.meta.env.DEV
      ? getLegacyDevelopmentConfig()
      : null

    if (!legacyConfig) throw error

    console.warn(
      'Platform runtime configuration is unavailable; using the local single-store fallback.',
      error
    )
    return legacyConfig
  }
}

export async function loadStorefrontRuntimeConfig() {
  if (!runtimeConfigPromise) {
    runtimeConfigPromise = requestRuntimeConfig().then(config => {
      runtimeConfig = config
      return config
    })
  }

  return runtimeConfigPromise
}

export function getLoadedStorefrontRuntimeConfig() {
  return runtimeConfig
}

export function getStorefrontCountryCode() {
  return (
    runtimeConfig?.storefront?.countryCode ||
    import.meta.env.VITE_SHOPIFY_COUNTRY_CODE?.trim() ||
    'US'
  )
}

