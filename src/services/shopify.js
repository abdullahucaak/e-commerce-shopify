const domain = import.meta.env.VITE_SHOPIFY_DOMAIN
const storefrontToken = import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN
const apiVersion = import.meta.env.VITE_SHOPIFY_API_VERSION

const endpoint = `https://${domain}/api/${apiVersion}/graphql.json`

export async function shopifyFetch(query, variables = {}) {
  if (!domain || !storefrontToken || !apiVersion) {
    throw new Error('Shopify environment variables are missing.')
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': storefrontToken
    },
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