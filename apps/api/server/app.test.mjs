import assert from 'node:assert/strict'
import test from 'node:test'
import { buildApp } from './app.mjs'
import { normalizeStorefrontHostname } from './storefront-config.mjs'

const STOREFRONT_ROW = {
  storefront_id: '5d07f694-421d-4538-acf3-6c3337284628',
  shop_name: 'GlowField',
  current_myshopify_domain: 'glowfield-2.myshopify.com',
  currency_code: 'USD',
  primary_locale: 'en',
  default_country_code: 'US',
  storefront_public_access_token: 'public-storefront-token',
  config_version: 3,
  config_schema_version: 1,
  design_settings: {
    brand: {
      name: 'GlowField',
      colors: {
        primary: '#303841',
        secondary: '#007dcc'
      }
    }
  },
  release_version: '1.0.0',
  release_channel: 'stable',
  feature_flags: { new_gallery: true }
}

test('reports liveness without exposing tenant data', async t => {
  const app = buildApp({
    database: { query: async () => ({ rows: [] }) },
    logger: false
  })
  t.after(() => app.close())

  const response = await app.inject({
    method: 'GET',
    url: '/api/health'
  })

  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), { status: 'ok' })
})

test('reports database readiness', async t => {
  let query = null
  const app = buildApp({
    database: {
      async query(value) {
        query = value
        return { rows: [{ '?column?': 1 }] }
      }
    },
    logger: false
  })
  t.after(() => app.close())

  const response = await app.inject({
    method: 'GET',
    url: '/api/ready'
  })

  assert.equal(response.statusCode, 200)
  assert.equal(query, 'select 1')
  assert.deepEqual(response.json(), {
    status: 'ok',
    database: 'reachable'
  })
})

test('rejects account access without a bearer token', async t => {
  let queried = false
  const app = buildApp({
    database: {
      async query() {
        queried = true
        return { rows: [] }
      }
    },
    verifyAccessToken: async () => {
      throw new Error('Verifier must not run without a token.')
    },
    logger: false
  })
  t.after(() => app.close())

  const response = await app.inject({ method: 'GET', url: '/api/account' })

  assert.equal(response.statusCode, 401)
  assert.deepEqual(response.json(), { error: 'authentication_required' })
  assert.equal(queried, false)
})

test('returns only the verified user account context', async t => {
  let receivedToken = null
  let receivedParameters = null
  const app = buildApp({
    database: {
      async query(_query, parameters) {
        receivedParameters = parameters
        return {
          rows: [{
            workspace_id: 'workspace-1',
            role: 'owner',
            workspace_name: 'GlowField',
            shopify_store_id: 'store-1',
            shop_name: 'GlowField',
            current_myshopify_domain: 'glowfield-2.myshopify.com',
            shopify_store_status: 'active',
            storefront_id: 'storefront-1',
            storefront_status: 'active'
          }]
        }
      }
    },
    verifyAccessToken: async token => {
      receivedToken = token
      return { id: 'user-1', email: 'owner@example.com' }
    },
    logger: false
  })
  t.after(() => app.close())

  const response = await app.inject({
    method: 'GET',
    url: '/api/account',
    headers: { authorization: 'Bearer verified-token' }
  })

  assert.equal(response.statusCode, 200)
  assert.equal(receivedToken, 'verified-token')
  assert.deepEqual(receivedParameters, ['user-1'])
  assert.deepEqual(response.json(), {
    user: { id: 'user-1', email: 'owner@example.com' },
    workspaces: [{
      id: 'workspace-1',
      name: 'GlowField',
      role: 'owner',
      stores: [{
        id: 'store-1',
        name: 'GlowField',
        myshopifyDomain: 'glowfield-2.myshopify.com',
        status: 'active',
        storefront: { id: 'storefront-1', status: 'active' }
      }]
    }]
  })
})

test('returns 503 when the database is unavailable', async t => {
  const app = buildApp({
    database: {
      async query() {
        throw new Error('connection failed')
      }
    },
    logger: false
  })
  t.after(() => app.close())

  const response = await app.inject({ method: 'GET', url: '/api/ready' })

  assert.equal(response.statusCode, 503)
  assert.deepEqual(response.json(), {
    status: 'unavailable',
    database: 'unreachable'
  })
})

test('keeps domain reads scoped to the authenticated user and selected storefront', async t => {
  const calls = []
  const app = buildApp({
    database: { query: async () => ({ rows: [] }) },
    verifyAccessToken: async token => ({ id: token === 'user-a-token' ? 'user-a' : 'user-b' }),
    shopifyDomains: {
      async read(input) {
        calls.push(input)
        return {
          myshopifyDomain: `${input.storefrontId}.myshopify.com`,
          shopifyPrimaryDomain: `${input.storefrontId}.example`,
          domains: [{ hostname: `${input.storefrontId}.example`, status: 'active' }]
        }
      }
    },
    logger: false
  })
  t.after(() => app.close())

  const first = await app.inject({
    method: 'GET', url: '/api/storefronts/storefront-a/domains',
    headers: { authorization: 'Bearer user-a-token' }
  })
  const second = await app.inject({
    method: 'GET', url: '/api/storefronts/storefront-b/domains',
    headers: { authorization: 'Bearer user-b-token' }
  })

  assert.equal(first.statusCode, 200)
  assert.equal(second.statusCode, 200)
  assert.notDeepEqual(first.json(), second.json())
  assert.deepEqual(calls, [
    { userId: 'user-a', storefrontId: 'storefront-a' },
    { userId: 'user-b', storefrontId: 'storefront-b' }
  ])
})

test('does not synchronize a storefront domain for an anonymous request', async t => {
  let called = false
  const app = buildApp({
    database: { query: async () => ({ rows: [] }) },
    shopifyDomains: { sync: async () => { called = true } },
    logger: false
  })
  t.after(() => app.close())

  const response = await app.inject({
    method: 'POST', url: '/api/storefronts/storefront-a/domains/sync'
  })
  assert.equal(response.statusCode, 401)
  assert.equal(called, false)
})

test('starts Shopify OAuth only for an authenticated platform user', async t => {
  let beginInput = null
  const app = buildApp({
    database: { query: async () => ({ rows: [] }) },
    verifyAccessToken: async () => ({ id: 'user-1' }),
    shopifyOAuth: {
      async begin(input) {
        beginInput = input
        return 'https://example.myshopify.com/admin/oauth/authorize'
      }
    },
    logger: false
  })
  t.after(() => app.close())

  const response = await app.inject({
    method: 'POST',
    url: '/api/shopify/connect',
    headers: { authorization: 'Bearer verified-token' },
    payload: {
      workspaceId: 'workspace-1',
      shop: 'example.myshopify.com'
    }
  })

  assert.equal(response.statusCode, 200)
  assert.equal(beginInput.user.id, 'user-1')
  assert.equal(beginInput.workspaceId, 'workspace-1')
  assert.equal(beginInput.shop, 'example.myshopify.com')
})

test('rejects anonymous Shopify OAuth start requests', async t => {
  const app = buildApp({
    database: { query: async () => ({ rows: [] }) },
    shopifyOAuth: { begin: async () => '' },
    logger: false
  })
  t.after(() => app.close())

  const response = await app.inject({
    method: 'POST',
    url: '/api/shopify/connect',
    payload: { workspaceId: 'workspace-1', shop: 'example.myshopify.com' }
  })

  assert.equal(response.statusCode, 401)
  assert.deepEqual(response.json(), { error: 'authentication_required' })
})

test('normalizes a storefront hostname without changing its subdomain', () => {
  assert.equal(
    normalizeStorefrontHostname('WWW.GlowField.co:443'),
    'www.glowfield.co'
  )
})

test('rejects a storefront hostname containing a path', () => {
  assert.throws(
    () => normalizeStorefrontHostname('glowfield.co/admin'),
    /invalid/
  )
})

test('returns the published runtime config for the request hostname', async t => {
  let receivedQuery = null
  let receivedParameters = null
  const app = buildApp({
    database: {
      async query(query, parameters) {
        receivedQuery = query
        receivedParameters = parameters
        return { rows: [STOREFRONT_ROW] }
      }
    },
    logger: false,
    shopifyApiVersion: '2026-07'
  })
  t.after(() => app.close())

  const response = await app.inject({
    method: 'GET',
    url: '/api/storefront/config',
    headers: { host: 'GLOWFIELD.CO:3000' }
  })

  assert.equal(response.statusCode, 200)
  assert.match(receivedQuery, /public[.]store_domains/)
  assert.deepEqual(receivedParameters, ['glowfield.co'])
  assert.equal(
    response.headers['cache-control'],
    'no-store, no-cache, must-revalidate'
  )
  assert.deepEqual(response.json(), {
    storefront: {
      id: STOREFRONT_ROW.storefront_id,
      hostname: 'glowfield.co',
      name: 'GlowField',
      locale: 'en',
      currencyCode: 'USD',
      countryCode: 'US'
    },
    shopify: {
      domain: 'glowfield-2.myshopify.com',
      apiVersion: '2026-07',
      storefrontAccessToken: 'public-storefront-token'
    },
    design: STOREFRONT_ROW.design_settings,
    config: { version: 3, schemaVersion: 1 },
    release: { version: '1.0.0', channel: 'stable' },
    features: { new_gallery: true }
  })
  assert.equal(response.body.includes('admin_access_token'), false)
})

test('returns 404 for an unknown storefront hostname', async t => {
  const app = buildApp({
    database: { query: async () => ({ rows: [] }) },
    logger: false
  })
  t.after(() => app.close())

  const response = await app.inject({
    method: 'GET',
    url: '/api/storefront/config',
    headers: { host: 'unknown.example.com' }
  })

  assert.equal(response.statusCode, 404)
  assert.deepEqual(response.json(), { error: 'storefront_not_found' })
})

test('allows an explicit storefront host only in configured development environments', async t => {
  let receivedParameters = null
  const database = {
    async query(_query, parameters) {
      receivedParameters = parameters
      return { rows: [STOREFRONT_ROW] }
    }
  }

  const productionApp = buildApp({ database, logger: false })
  t.after(() => productionApp.close())

  const rejected = await productionApp.inject({
    method: 'GET',
    url: '/api/storefront/config?host=glowfield.co'
  })

  assert.equal(rejected.statusCode, 400)
  assert.deepEqual(rejected.json(), {
    error: 'storefront_host_override_disabled'
  })

  const developmentApp = buildApp({
    database,
    logger: false,
    allowStorefrontHostOverride: true
  })
  t.after(() => developmentApp.close())

  const accepted = await developmentApp.inject({
    method: 'GET',
    url: '/api/storefront/config?host=glowfield.co'
  })

  assert.equal(accepted.statusCode, 200)
  assert.deepEqual(receivedParameters, ['glowfield.co'])
})
