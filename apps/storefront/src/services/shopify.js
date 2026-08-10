import { loadStorefrontRuntimeConfig } from './storefrontRuntime'

export async function shopifyFetch(query, variables = {}) {
  const runtimeConfig = await loadStorefrontRuntimeConfig()
  const {
    domain,
    storefrontAccessToken,
    apiVersion
  } = runtimeConfig.shopify

  if (!domain || !apiVersion) {
    throw new Error('Shopify runtime configuration is missing.')
  }

  const endpoint = `https://${domain}/api/${apiVersion}/graphql.json`
  const headers = { 'Content-Type': 'application/json' }

  if (storefrontAccessToken) {
    headers['X-Shopify-Storefront-Access-Token'] = storefrontAccessToken
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query,
      variables
    })
  })

  let result

  try {
    result = await response.json()
  } catch {
    throw new Error('Shopify returned an invalid response.')
  }

  if (!response.ok) {
    const message =
      result?.errors?.map(error => error.message).join(', ') ||
      `Shopify request failed with status ${response.status}.`

    throw new Error(message)
  }

  if (result.errors?.length) {
    throw new Error(
      result.errors.map(error => error.message).join(', ')
    )
  }

  return result.data
}
