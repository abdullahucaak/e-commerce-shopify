import { decryptAdminToken } from './shopify-oauth.mjs'
import { normalizeStorefrontHostname } from './storefront-config.mjs'

const MYSHOPIFY_DOMAIN = /^[a-z0-9][a-z0-9-]*[.]myshopify[.]com$/

async function shopifyPrimaryDomain({ shop, accessToken, apiVersion }) {
  const response = await fetch(`https://${shop}/admin/api/${apiVersion}/graphql.json`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-shopify-access-token': accessToken
    },
    body: JSON.stringify({
      query: `query PlatformPrimaryDomain {
        shop {
          primaryDomain { host sslEnabled }
          myshopifyDomain
        }
      }`
    })
  })
  const payload = await response.json()
  if (!response.ok || payload.errors?.length || !payload.data?.shop) {
    throw new Error('shopify_domain_lookup_failed')
  }
  return payload.data.shop
}

export function createShopifyDomainService({ database, apiVersion, encryptionSecret }) {
  async function read({ userId, storefrontId }) {
    const result = await database.query(
      `select domain.id::text, domain.hostname, domain.kind::text, domain.status::text,
              domain.is_primary, domain.verified_at, domain.activated_at,
              store.current_myshopify_domain, store.shopify_primary_domain
       from public.storefronts storefront
       join public.shopify_stores store on store.id = storefront.shopify_store_id
       join public.workspace_memberships membership
         on membership.workspace_id = store.workspace_id and membership.user_id = $1
       left join public.store_domains domain on domain.storefront_id = storefront.id
       where storefront.id = $2
       order by domain.is_primary desc, domain.created_at asc`,
      [userId, storefrontId]
    )
    if (!result.rows.length) return null
    const first = result.rows[0]
    return {
      shopifyPrimaryDomain: first.shopify_primary_domain || null,
      myshopifyDomain: first.current_myshopify_domain,
      domains: result.rows.filter(row => row.id).map(row => ({
        id: row.id,
        hostname: row.hostname,
        kind: row.kind,
        status: row.status,
        isPrimary: row.is_primary,
        verifiedAt: row.verified_at,
        activatedAt: row.activated_at
      }))
    }
  }

  async function syncRecord(row) {
    const storefrontId = row.storefront_id
    const adminToken = decryptAdminToken(row.admin_access_token_ciphertext, encryptionSecret)
    const shop = await shopifyPrimaryDomain({
      shop: row.current_myshopify_domain,
      accessToken: adminToken,
      apiVersion
    })
    const primaryHostname = normalizeStorefrontHostname(shop.primaryDomain.host)
    const myshopifyHostname = normalizeStorefrontHostname(shop.myshopifyDomain)
    if (!MYSHOPIFY_DOMAIN.test(myshopifyHostname)) throw new Error('invalid_shop_domain')

    const shopifyDomains = [
      { hostname: primaryHostname, sslEnabled: Boolean(shop.primaryDomain.sslEnabled) },
      { hostname: myshopifyHostname, sslEnabled: true }
    ]
    const domainsByHostname = new Map(
      shopifyDomains.map(domain => [domain.hostname, domain])
    )

    const client = await database.connect()
    try {
      await client.query('begin')
      const hostnames = [...domainsByHostname.keys()]
      const collision = await client.query(
        `select hostname from public.store_domains
         where lower(hostname) = any($1::text[]) and storefront_id <> $2
         for update`,
        [hostnames, storefrontId]
      )
      if (collision.rows.length) throw new Error('domain_already_claimed')

      await client.query(
        `update public.store_domains
         set is_primary = false, status = 'disabled', updated_at = now()
         where storefront_id = $1 and hostname <> all($2::text[])`,
        [storefrontId, hostnames]
      )
      await client.query(
        `update public.store_domains
         set is_primary = false, updated_at = now()
         where storefront_id = $1 and is_primary = true`,
        [storefrontId]
      )
      for (const [hostname, domain] of domainsByHostname) {
        const isPrimary = hostname === primaryHostname
        const status = domain.sslEnabled ? 'active' : 'verified'
        await client.query(
          `insert into public.store_domains (
             storefront_id, hostname, kind, status, is_primary, verified_at, activated_at
           ) values (
             $1, $2, $3, $4::public.storefront_domain_status, $5, now(),
             case when $4::public.storefront_domain_status = 'active' then now() else null end
           )
           on conflict (lower(hostname)) do update set
             kind = excluded.kind,
             status = excluded.status,
             is_primary = excluded.is_primary,
             verified_at = coalesce(public.store_domains.verified_at, now()),
             activated_at = case
               when excluded.status = 'active'
                 then coalesce(public.store_domains.activated_at, now())
               else public.store_domains.activated_at
             end,
             last_error = null,
             updated_at = now()
           where public.store_domains.storefront_id = excluded.storefront_id`,
          [
            storefrontId,
            hostname,
            MYSHOPIFY_DOMAIN.test(hostname) ? 'preview' : 'custom',
            status,
            isPrimary
          ]
        )
      }
      await client.query(
        `update public.shopify_stores
         set shopify_primary_domain = $2, last_shop_sync_at = now(), updated_at = now()
         where id = $1`,
        [row.shopify_store_id, primaryHostname]
      )
      await client.query(
        `update public.storefronts set status = 'active', updated_at = now() where id = $1`,
        [storefrontId]
      )
      await client.query('commit')
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  }

  async function sync({ userId, storefrontId }) {
    const access = await database.query(
      `select storefront.id::text as storefront_id, store.id::text as shopify_store_id,
              store.current_myshopify_domain, membership.role::text,
              credentials.admin_access_token_ciphertext
       from public.storefronts storefront
       join public.shopify_stores store on store.id = storefront.shopify_store_id
       join public.workspace_memberships membership
         on membership.workspace_id = store.workspace_id and membership.user_id = $1
       join private.shopify_credentials credentials on credentials.shopify_store_id = store.id
       where storefront.id = $2`,
      [userId, storefrontId]
    )
    const row = access.rows[0]
    if (!row) throw new Error('storefront_access_denied')
    if (!['owner', 'admin', 'editor'].includes(row.role)) throw new Error('storefront_write_denied')

    await syncRecord(row)
    return read({ userId, storefrontId })
  }

  async function syncStore({ shopifyStoreId }) {
    const result = await database.query(
      `select storefront.id::text as storefront_id, store.id::text as shopify_store_id,
              store.current_myshopify_domain, credentials.admin_access_token_ciphertext
       from public.storefronts storefront
       join public.shopify_stores store on store.id = storefront.shopify_store_id
       join private.shopify_credentials credentials on credentials.shopify_store_id = store.id
       where store.id = $1`,
      [shopifyStoreId]
    )
    if (!result.rows[0]) throw new Error('shopify_store_not_found')
    await syncRecord(result.rows[0])
  }

  return { read, sync, syncStore }
}
