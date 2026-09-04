const SHOP_DOMAIN_PATTERN = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/

export function selectedShopFromSearch(search = '') {
  const shop = new URLSearchParams(search).get('shop')?.trim().toLowerCase() || ''
  return SHOP_DOMAIN_PATTERN.test(shop) ? shop : null
}

export function shopifyConnectPayload(workspaceId, shop = null) {
  return shop ? { workspaceId, shop } : { workspaceId }
}

export function normalizeShopDomain(value = '') {
  const normalized = value.trim().toLowerCase()
  if (!normalized) return null
  const domain = normalized.includes('.') ? normalized : `${normalized}.myshopify.com`
  return SHOP_DOMAIN_PATTERN.test(domain) ? domain : null
}
