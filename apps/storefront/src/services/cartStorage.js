export function getCartStorageKeyForRuntime(runtimeConfig) {
  const storefrontIdentity =
    runtimeConfig?.storefront?.id ||
    runtimeConfig?.shopify?.domain ||
    'unconfigured-storefront'

  return `shopifyCartId:${storefrontIdentity}`
}
