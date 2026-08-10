import { domainToASCII } from 'node:url'

const STOREFRONT_CONFIG_QUERY = `
  select
    storefront.id::text as storefront_id,
    store.shop_name,
    store.current_myshopify_domain,
    store.currency_code,
    store.primary_locale,
    store.default_country_code,
    credentials.storefront_public_access_token,
    config.version as config_version,
    config.schema_version as config_schema_version,
    config.settings as design_settings,
    release.version as release_version,
    storefront.release_channel,
    coalesce(features.flags, '{}'::jsonb) as feature_flags
  from public.store_domains domain
  join public.storefronts storefront
    on storefront.id = domain.storefront_id
  join public.shopify_stores store
    on store.id = storefront.shopify_store_id
  left join private.shopify_credentials credentials
    on credentials.shopify_store_id = store.id
  left join lateral (
    select
      version,
      schema_version,
      settings
    from public.storefront_config_versions
    where storefront_id = storefront.id
      and status = 'published'
    order by version desc
    limit 1
  ) config on true
  left join lateral (
    select
      candidate.version,
      candidate.config_schema_version
    from public.platform_releases candidate
    where (
      storefront.pinned_release_id is not null
      and candidate.id = storefront.pinned_release_id
    ) or (
      storefront.pinned_release_id is null
      and candidate.channel = storefront.release_channel
      and candidate.status = 'active'
    )
    order by
      case when candidate.id = storefront.pinned_release_id then 0 else 1 end,
      candidate.activated_at desc nulls last
    limit 1
  ) release on true
  left join lateral (
    select jsonb_object_agg(
      flag.key,
      coalesce(override.enabled, flag.enabled)
    ) as flags
    from public.platform_feature_flags flag
    left join public.store_feature_overrides override
      on override.storefront_id = storefront.id
      and override.feature_key = flag.key
  ) features on true
  where domain.hostname = $1
    and domain.status = 'active'
    and storefront.status = 'active'
    and store.status = 'active'
  limit 1
`

export function normalizeStorefrontHostname(value) {
  const firstValue = Array.isArray(value) ? value[0] : value
  const rawValue = String(firstValue || '').split(',')[0].trim().toLowerCase()

  if (!rawValue) throw new Error('Storefront hostname is missing.')

  let parsed
  try {
    parsed = new URL(`http://${rawValue}`)
  } catch {
    throw new Error('Storefront hostname is invalid.')
  }

  if (
    parsed.username ||
    parsed.password ||
    parsed.pathname !== '/' ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error('Storefront hostname is invalid.')
  }

  const hostname = domainToASCII(parsed.hostname.replace(/[.]$/, '')).toLowerCase()

  if (!hostname || hostname.length > 253 || hostname.includes(':')) {
    throw new Error('Storefront hostname is invalid.')
  }

  const labels = hostname.split('.')
  const validLabels = labels.every(label => (
    label.length >= 1 &&
    label.length <= 63 &&
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
  ))

  if (!validLabels) throw new Error('Storefront hostname is invalid.')

  return hostname
}

export async function findStorefrontRuntimeConfig({
  database,
  hostname,
  shopifyApiVersion
}) {
  const result = await database.query(STOREFRONT_CONFIG_QUERY, [hostname])
  const row = result.rows[0]

  if (!row) return null

  return {
    storefront: {
      id: row.storefront_id,
      hostname,
      name: row.shop_name,
      locale: row.primary_locale || 'en',
      currencyCode: row.currency_code || 'USD',
      countryCode: row.default_country_code || 'US'
    },
    shopify: {
      domain: row.current_myshopify_domain,
      apiVersion: shopifyApiVersion,
      storefrontAccessToken: row.storefront_public_access_token || null
    },
    design: row.design_settings || {},
    config: {
      version: row.config_version || null,
      schemaVersion: row.config_schema_version || 1
    },
    release: {
      version: row.release_version || null,
      channel: row.release_channel
    },
    features: row.feature_flags || {}
  }
}

