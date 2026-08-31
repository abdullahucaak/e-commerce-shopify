export function resolveSelectedStoreId(stores, { storefrontId = '', currentStoreId = '' } = {}) {
  const availableStores = (stores || []).filter(store => store.storefront?.id)
  const requestedStore = availableStores.find(store => store.storefront.id === storefrontId)
  if (requestedStore) return requestedStore.id
  if (availableStores.some(store => store.id === currentStoreId)) return currentStoreId
  return availableStores[0]?.id || ''
}
