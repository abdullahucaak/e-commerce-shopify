const PRODUCT_READINESS_QUERY = `
  query ProductReadiness {
    products(first: 1) {
      nodes { id }
    }
  }
`

function shopifyProductsAdminUrl(myshopifyDomain) {
  const handle = String(myshopifyDomain || '').replace(/\.myshopify\.com$/i, '')
  return handle
    ? `https://admin.shopify.com/store/${encodeURIComponent(handle)}/products`
    : 'https://admin.shopify.com/'
}

export function createProductReadinessService({
  database,
  apiVersion = '2026-07',
  fetchImpl = fetch
}) {
  if (!database?.query) throw new Error('database.query is required.')

  async function check({ userId, storefrontId }) {
    const access = await database.query(
      `select storefront.id, store.current_myshopify_domain,
              credentials.storefront_public_access_token
       from public.storefronts storefront
       join public.shopify_stores store on store.id = storefront.shopify_store_id
       join public.workspace_memberships membership
         on membership.workspace_id = store.workspace_id and membership.user_id = $2
       join private.shopify_credentials credentials
         on credentials.shopify_store_id = store.id
       where storefront.id = $1
       limit 1`,
      [storefrontId, userId]
    )
    const storefront = access.rows[0]
    if (!storefront) throw new Error('storefront_access_denied')

    const headers = { 'content-type': 'application/json' }
    if (storefront.storefront_public_access_token) {
      headers['x-shopify-storefront-access-token'] = storefront.storefront_public_access_token
    }
    const response = await fetchImpl(
      `https://${storefront.current_myshopify_domain}/api/${apiVersion}/graphql.json`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: PRODUCT_READINESS_QUERY })
      }
    )
    const payload = await response.json().catch(() => null)
    if (!response.ok || payload?.errors?.length || !payload?.data?.products) {
      throw new Error('shopify_product_check_failed')
    }

    const ready = payload.data.products.nodes.length > 0
    await database.query(
      `insert into public.onboarding_progress (
         storefront_id, step_key, status, completed_at, data
       ) values (
         $1, 'product_readiness', $2::public.onboarding_step_status,
         case when $2 = 'completed' then now() else null end,
         jsonb_build_object('ready', $3::boolean, 'checkedAt', now())
       )
       on conflict (storefront_id, step_key) do update set
         status = excluded.status,
         completed_at = excluded.completed_at,
         data = excluded.data,
         updated_at = now()`,
      [storefrontId, ready ? 'completed' : 'in_progress', ready]
    )

    return {
      ready,
      minimumProductCount: ready ? 1 : 0,
      productsAdminUrl: shopifyProductsAdminUrl(storefront.current_myshopify_domain)
    }
  }

  return { check }
}
