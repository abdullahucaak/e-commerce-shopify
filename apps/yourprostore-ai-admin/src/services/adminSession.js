export function resolveAdminAuthStep({ session, assurance }) {
  if (!session?.access_token) return 'login'
  return assurance?.currentLevel === 'aal2' ? 'authorize' : 'mfa'
}

function adminApiEndpoint(apiUrl, path) {
  const configuredUrl = `${String(apiUrl).replace(/\/$/, '')}${path}`
  const browserOrigin = typeof window === 'undefined' ? 'http://127.0.0.1' : window.location.origin
  return new URL(configuredUrl, browserOrigin)
}

export async function fetchAdminSession({ apiUrl = '', accessToken, fetchImpl = fetch }) {
  const endpoint = adminApiEndpoint(apiUrl, '/api/admin/session')
  const response = await fetchImpl(endpoint, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` }
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.error || 'platform_admin_unavailable')
    error.status = response.status
    throw error
  }
  return payload.admin
}

export async function fetchPlatformOverview({ apiUrl = '', accessToken, fetchImpl = fetch }) {
  const endpoint = adminApiEndpoint(apiUrl, '/api/admin/overview')
  const response = await fetchImpl(endpoint, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` }
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'platform_overview_unavailable')
  return payload.overview
}

export async function fetchPlatformWorkspaces({
  apiUrl = '', accessToken, page = 1, pageSize = 25, fetchImpl = fetch
}) {
  const endpoint = adminApiEndpoint(apiUrl, '/api/admin/workspaces')
  endpoint.searchParams.set('page', String(page))
  endpoint.searchParams.set('pageSize', String(pageSize))
  const response = await fetchImpl(endpoint, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` }
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'platform_workspaces_unavailable')
  return payload.workspaces
}

export async function fetchPlatformStores({
  apiUrl = '', accessToken, page = 1, pageSize = 25, fetchImpl = fetch
}) {
  const endpoint = adminApiEndpoint(apiUrl, '/api/admin/stores')
  endpoint.searchParams.set('page', String(page)); endpoint.searchParams.set('pageSize', String(pageSize))
  const response = await fetchImpl(endpoint, { headers: {
    Accept: 'application/json', Authorization: `Bearer ${accessToken}`
  } })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'platform_stores_unavailable')
  return payload.stores
}

export async function fetchPlatformStore({ apiUrl = '', accessToken, storeId, fetchImpl = fetch }) {
  const endpoint = adminApiEndpoint(apiUrl, `/api/admin/stores/${encodeURIComponent(storeId)}`)
  const response = await fetchImpl(endpoint, { headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` } })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'platform_store_unavailable')
  return payload.store
}

export async function fetchPlatformOperations({ apiUrl='', accessToken, limit=50, fetchImpl=fetch }) {
  const endpoint=adminApiEndpoint(apiUrl,'/api/admin/operations');endpoint.searchParams.set('limit',String(limit))
  const response=await fetchImpl(endpoint,{headers:{Accept:'application/json',Authorization:`Bearer ${accessToken}`}})
  const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload.error||'platform_operations_unavailable')
  return payload.operations
}

export async function fetchPlatformCatalog({apiUrl='',accessToken,fetchImpl=fetch}){const response=await fetchImpl(adminApiEndpoint(apiUrl,'/api/admin/catalog'),{headers:{Accept:'application/json',Authorization:`Bearer ${accessToken}`}});const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload.error||'platform_catalog_unavailable');return payload.catalog}
export async function changeCatalogActive({apiUrl='',accessToken,kind,id,active,reason,fetchImpl=fetch}){const response=await fetchImpl(adminApiEndpoint(apiUrl,`/api/admin/catalog/${kind}/${id}/active`),{method:'PATCH',headers:{Accept:'application/json','Content-Type':'application/json',Authorization:`Bearer ${accessToken}`},body:JSON.stringify({active,reason})});const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload.error||'platform_catalog_unavailable');return payload.item}
export async function changeStorefrontStatus({apiUrl='',accessToken,storeId,status,reason,confirmation,fetchImpl=fetch}){const response=await fetchImpl(adminApiEndpoint(apiUrl,`/api/admin/stores/${storeId}/storefront-status`),{method:'PATCH',headers:{Accept:'application/json','Content-Type':'application/json',Authorization:`Bearer ${accessToken}`},body:JSON.stringify({status,reason,confirmation})});const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload.error||'platform_storefront_update_unavailable');return payload.storefront}
