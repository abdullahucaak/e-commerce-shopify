import pg from 'pg'

const { Pool } = pg

const REQUIRED_ENV = [
  'DATABASE_URL',
  'VITE_SHOPIFY_DOMAIN',
  'VITE_SHOPIFY_STOREFRONT_TOKEN',
  'VITE_SHOPIFY_API_VERSION'
]

const GLOWFIELD = Object.freeze({
  workspaceName: 'GlowField',
  currentMyshopifyDomain: 'glowfield-2.myshopify.com',
  historicalMyshopifyDomains: ['tzs113-0n.myshopify.com'],
  primaryHostname: 'glowfield.co',
  hostnames: ['glowfield.co', 'www.glowfield.co'],
  releaseVersion: '0.1.0',
  design: {
    brand: {
      name: 'GlowField',
      logo: {
        alt: 'GlowField',
        position: 'left center'
      },
      colors: {
        primary: '#303841',
        secondary: '#007DCC'
      }
    }
  }
})

function requiredEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required.`)
  return value
}

function normalizeHostname(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
}

async function readShopifyIdentity({ domain, token, apiVersion }) {
  const query = `
    query BootstrapShop {
      shop {
        id
        name
        primaryDomain { host }
        paymentSettings { currencyCode }
      }
      localization {
        country { isoCode }
        language { isoCode }
      }
    }
  `

  const response = await fetch(`https://${domain}/api/${apiVersion}/graphql.json`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-shopify-storefront-access-token': token
    },
    body: JSON.stringify({ query })
  })
  const payload = await response.json()

  if (!response.ok || payload.errors?.length) {
    const message = payload.errors?.map(error => error.message).join('; ')
    throw new Error(message || `Shopify returned HTTP ${response.status}.`)
  }

  return payload.data
}

async function upsertGlowfield(client, { identity, storefrontToken }) {
  const existingStore = await client.query(
    'select workspace_id from public.shopify_stores where shopify_gid = $1',
    [identity.shop.id]
  )

  let workspaceId = existingStore.rows[0]?.workspace_id
  if (!workspaceId) {
    const workspace = await client.query(
      'insert into public.workspaces (name) values ($1) returning id',
      [GLOWFIELD.workspaceName]
    )
    workspaceId = workspace.rows[0].id
  }

  await client.query(
    `insert into public.platform_releases (
       version, channel, status, config_schema_version, notes, activated_at
     ) values ($1, 'stable', 'active', 1, $2, now())
     on conflict (version) do update set
       channel = excluded.channel,
       status = excluded.status,
       config_schema_version = excluded.config_schema_version,
       notes = excluded.notes,
       activated_at = coalesce(public.platform_releases.activated_at, now())`,
    [GLOWFIELD.releaseVersion, 'Initial shared Vue storefront release.']
  )

  const storeResult = await client.query(
    `insert into public.shopify_stores (
       workspace_id,
       shopify_gid,
       installed_myshopify_domain,
       current_myshopify_domain,
       shopify_primary_domain,
       shop_name,
       status,
       currency_code,
       primary_locale,
       default_country_code,
       last_shop_sync_at
     ) values ($1, $2, $3, $3, $4, $5, 'active', $6, $7, $8, now())
     on conflict (shopify_gid) do update set
       current_myshopify_domain = excluded.current_myshopify_domain,
       shopify_primary_domain = excluded.shopify_primary_domain,
       shop_name = excluded.shop_name,
       status = 'active',
       currency_code = excluded.currency_code,
       primary_locale = excluded.primary_locale,
       default_country_code = excluded.default_country_code,
       last_shop_sync_at = now()
     returning id`,
    [
      workspaceId,
      identity.shop.id,
      GLOWFIELD.currentMyshopifyDomain,
      normalizeHostname(identity.shop.primaryDomain?.host) || GLOWFIELD.primaryHostname,
      identity.shop.name,
      identity.shop.paymentSettings?.currencyCode || 'USD',
      identity.localization?.language?.isoCode?.toLowerCase() || 'en',
      identity.localization?.country?.isoCode || 'US'
    ]
  )
  const shopifyStoreId = storeResult.rows[0].id

  await client.query(
    'update public.shopify_domain_aliases set is_current = false where shopify_store_id = $1',
    [shopifyStoreId]
  )

  const aliases = [
    GLOWFIELD.currentMyshopifyDomain,
    ...GLOWFIELD.historicalMyshopifyDomains
  ]
  for (const myshopifyDomain of aliases) {
    await client.query(
      `insert into public.shopify_domain_aliases (
         shopify_store_id, myshopify_domain, is_current
       ) values ($1, $2, $3)
       on conflict (lower(myshopify_domain)) do update set
         shopify_store_id = excluded.shopify_store_id,
         is_current = excluded.is_current,
         last_seen_at = now()`,
      [
        shopifyStoreId,
        myshopifyDomain,
        myshopifyDomain === GLOWFIELD.currentMyshopifyDomain
      ]
    )
  }

  await client.query(
    `insert into private.shopify_credentials (
       shopify_store_id, storefront_public_access_token
     ) values ($1, $2)
     on conflict (shopify_store_id) do update set
       storefront_public_access_token = excluded.storefront_public_access_token`,
    [shopifyStoreId, storefrontToken]
  )

  const storefrontResult = await client.query(
    `insert into public.storefronts (shopify_store_id, status, release_channel)
     values ($1, 'active', 'stable')
     on conflict (shopify_store_id) do update set
       status = 'active',
       release_channel = 'stable'
     returning id`,
    [shopifyStoreId]
  )
  const storefrontId = storefrontResult.rows[0].id

  await client.query(
    'update public.store_domains set is_primary = false where storefront_id = $1',
    [storefrontId]
  )

  for (const hostname of GLOWFIELD.hostnames) {
    await client.query(
      `insert into public.store_domains (
         storefront_id,
         hostname,
         kind,
         status,
         is_primary,
         verified_at,
         activated_at
       ) values ($1, $2, 'custom', 'active', $3, now(), now())
       on conflict (lower(hostname)) do update set
         storefront_id = excluded.storefront_id,
         status = 'active',
         is_primary = excluded.is_primary,
         verified_at = coalesce(public.store_domains.verified_at, now()),
         activated_at = coalesce(public.store_domains.activated_at, now()),
         last_error = null`,
      [storefrontId, hostname, hostname === GLOWFIELD.primaryHostname]
    )
  }

  await client.query(
    `insert into public.storefront_config_versions (
       storefront_id,
       version,
       schema_version,
       status,
       settings,
       published_at
     ) values ($1, 1, 1, 'published', $2::jsonb, now())
     on conflict (storefront_id, version) do update set
       schema_version = excluded.schema_version,
       status = 'published',
       settings = excluded.settings,
       published_at = coalesce(public.storefront_config_versions.published_at, now())`,
    [storefrontId, JSON.stringify(GLOWFIELD.design)]
  )

  const onboardingSteps = ['shopify_connected', 'domain_registered', 'brand_configured']
  for (const stepKey of onboardingSteps) {
    await client.query(
      `insert into public.onboarding_progress (
         storefront_id, step_key, status, completed_at
       ) values ($1, $2, 'completed', now())
       on conflict (storefront_id, step_key) do update set
         status = 'completed',
         completed_at = coalesce(public.onboarding_progress.completed_at, now())`,
      [storefrontId, stepKey]
    )
  }

  return { workspaceId, shopifyStoreId, storefrontId }
}

for (const name of REQUIRED_ENV) requiredEnv(name)

const domain = normalizeHostname(requiredEnv('VITE_SHOPIFY_DOMAIN'))
if (domain !== GLOWFIELD.currentMyshopifyDomain) {
  throw new Error(`Expected Shopify domain ${GLOWFIELD.currentMyshopifyDomain}.`)
}

const storefrontToken = requiredEnv('VITE_SHOPIFY_STOREFRONT_TOKEN')
const identity = await readShopifyIdentity({
  domain,
  token: storefrontToken,
  apiVersion: requiredEnv('VITE_SHOPIFY_API_VERSION')
})

const pool = new Pool({
  connectionString: requiredEnv('DATABASE_URL'),
  ssl: process.env.DATABASE_SSL === 'false'
    ? false
    : { rejectUnauthorized: false }
})
const client = await pool.connect()

try {
  await client.query('begin')
  const result = await upsertGlowfield(client, { identity, storefrontToken })
  await client.query('commit')
  console.log(JSON.stringify({
    status: 'seeded',
    shopifyGid: identity.shop.id,
    hostname: GLOWFIELD.primaryHostname,
    ...result
  }))
} catch (error) {
  await client.query('rollback')
  throw error
} finally {
  client.release()
  await pool.end()
}
