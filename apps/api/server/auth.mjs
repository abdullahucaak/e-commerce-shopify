import { createClient } from '@supabase/supabase-js'

const ACCOUNT_CONTEXT_QUERY = `
  select
    membership.workspace_id::text,
    membership.role::text,
    workspace.name as workspace_name,
    store.id::text as shopify_store_id,
    store.shop_name,
    store.current_myshopify_domain,
    store.status::text as shopify_store_status,
    storefront.id::text as storefront_id,
    storefront.status::text as storefront_status
  from public.workspace_memberships membership
  join public.workspaces workspace
    on workspace.id = membership.workspace_id
  left join public.shopify_stores store
    on store.workspace_id = workspace.id
  left join public.storefronts storefront
    on storefront.shopify_store_id = store.id
  where membership.user_id = $1
  order by membership.created_at, store.created_at
`

export function readBearerToken(authorizationHeader) {
  const match = String(authorizationHeader || '').match(/^Bearer[ ]+([^ ]+)$/i)
  return match?.[1] || null
}

export function createSupabaseAccessTokenVerifier({ supabaseUrl, publishableKey }) {
  const client = createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  })

  return async accessToken => {
    const { data, error } = await client.auth.getUser(accessToken)
    if (error || !data.user) return null
    return data.user
  }
}

export async function findAccountContext({ database, user }) {
  const result = await database.query(ACCOUNT_CONTEXT_QUERY, [user.id])
  const workspacesById = new Map()

  for (const row of result.rows) {
    if (!workspacesById.has(row.workspace_id)) {
      workspacesById.set(row.workspace_id, {
        id: row.workspace_id,
        name: row.workspace_name,
        role: row.role,
        stores: []
      })
    }

    if (row.shopify_store_id) {
      workspacesById.get(row.workspace_id).stores.push({
        id: row.shopify_store_id,
        name: row.shop_name,
        myshopifyDomain: row.current_myshopify_domain,
        status: row.shopify_store_status,
        storefront: row.storefront_id
          ? {
              id: row.storefront_id,
              status: row.storefront_status
            }
          : null
      })
    }
  }

  return {
    user: {
      id: user.id,
      email: user.email || null
    },
    workspaces: [...workspacesById.values()]
  }
}
