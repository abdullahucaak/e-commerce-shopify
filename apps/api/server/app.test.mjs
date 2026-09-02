import assert from 'node:assert/strict'
import test from 'node:test'
import { Writable } from 'node:stream'
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

test('denies platform admin routes to customer roles even with aal2', async t => {
  const app = buildApp({
    database: { query: async () => ({ rows: [] }) },
    verifyAccessToken: async () => ({ id: 'customer-1', authContext: { aal: 'aal2' } }),
    logger: false
  })
  t.after(() => app.close())

  const response = await app.inject({
    method: 'GET',
    url: '/api/admin/session',
    headers: { authorization: 'Bearer customer-token' }
  })

  assert.equal(response.statusCode, 403)
  assert.deepEqual(response.json(), { error: 'platform_admin_access_denied' })
})

test('requires aal2 before returning an active platform admin session', async t => {
  const database = {
    async query() { return { rows: [{ role: 'support', status: 'active', mfa_required: true }] } }
  }
  const aal1App = buildApp({
    database,
    verifyAccessToken: async () => ({ id: 'admin-1', authContext: { aal: 'aal1' } }),
    logger: false
  })
  t.after(() => aal1App.close())
  const rejected = await aal1App.inject({
    method: 'GET', url: '/api/admin/session', headers: { authorization: 'Bearer aal1' }
  })
  assert.equal(rejected.statusCode, 403)
  assert.equal(rejected.headers['x-auth-required-aal'], 'aal2')

  const aal2App = buildApp({
    database,
    verifyAccessToken: async () => ({
      id: 'admin-1', email: 'support@example.com', authContext: { aal: 'aal2' }
    }),
    logger: false
  })
  t.after(() => aal2App.close())
  const accepted = await aal2App.inject({
    method: 'GET', url: '/api/admin/session', headers: { authorization: 'Bearer aal2' }
  })
  assert.equal(accepted.statusCode, 200)
  assert.deepEqual(accepted.json(), {
    admin: { userId: 'admin-1', email: 'support@example.com', role: 'support' }
  })
})

test('does not query platform aggregates when admin access is denied', async t => {
  let aggregateQueried = false
  const app = buildApp({
    database: {
      async query(query) {
        if (query.includes('workspace_count')) aggregateQueried = true
        return { rows: [] }
      }
    },
    verifyAccessToken: async () => ({ id: 'customer-1', authContext: { aal: 'aal2' } }),
    logger: false
  })
  t.after(() => app.close())

  const response = await app.inject({
    method: 'GET', url: '/api/admin/overview', headers: { authorization: 'Bearer customer-token' }
  })

  assert.equal(response.statusCode, 403)
  assert.equal(aggregateQueried, false)
})

test('returns aggregate platform overview to an active aal2 admin', async t => {
  const app = buildApp({
    database: {
      async query(query) {
        if (query.includes('from private.platform_admins')) {
          return { rows: [{ role: 'read_only', status: 'active', mfa_required: true }] }
        }
        return { rows: [{
          workspace_count: 4,
          shopify_store_count: 5,
          storefront_count: 5,
          active_subscription_count: 3,
          failed_webhook_count: 2,
          dead_letter_webhook_count: 1
        }] }
      }
    },
    verifyAccessToken: async () => ({ id: 'admin-1', authContext: { aal: 'aal2' } }),
    logger: false
  })
  t.after(() => app.close())

  const response = await app.inject({
    method: 'GET', url: '/api/admin/overview', headers: { authorization: 'Bearer admin-token' }
  })

  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), {
    overview: {
      workspaces: 4,
      shopifyStores: 5,
      storefronts: 5,
      activeSubscriptions: 3,
      failedWebhooks: 2,
      deadLetterWebhooks: 1
    }
  })
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
            storefront_status: 'active',
            plan_key: 'starter_monthly',
            subscription_status: 'active',
            unit_amount: 900,
            currency_code: 'USD'
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
      storefrontAdminPermissions: {
        designWrite: true,
        contentWrite: true,
        domainsWrite: true,
        configRestore: true,
        assetFolders: ['logos', 'hero', 'about']
      },
      stores: [{
        id: 'store-1',
        name: 'GlowField',
        myshopifyDomain: 'glowfield-2.myshopify.com',
        status: 'active',
        storefront: {
          id: 'storefront-1',
          status: 'active',
          subscription: {
            planKey: 'starter_monthly',
            status: 'active',
            unitAmount: 900,
            currencyCode: 'USD'
          }
        }
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

test('creates a customer auth handoff only for a verified session', async t => {
  let issued = null
  const app = buildApp({
    database: { query: async () => ({ rows: [] }) },
    verifyAccessToken: async token => token === 'valid-access' ? { id: 'user-1' } : null,
    authHandoff: {
      async issue(input) {
        issued = input
        return { authorizationUrl: 'https://manage.example/auth/handoff?code=one-time' }
      }
    },
    logger: false
  })
  t.after(() => app.close())

  const response = await app.inject({
    method: 'POST', url: '/api/auth/handoff',
    headers: { authorization: 'Bearer valid-access' },
    payload: { refreshToken: 'refresh-token', returnPath: '/design?storefrontId=storefront-1' }
  })

  assert.equal(response.statusCode, 201)
  assert.deepEqual(issued, {
    userId: 'user-1', accessToken: 'valid-access', refreshToken: 'refresh-token',
    returnPath: '/design?storefrontId=storefront-1'
  })
})

test('exchanges a customer auth handoff without exposing the exchange through account auth', async t => {
  let exchangedCode = null
  const app = buildApp({
    database: { query: async () => ({ rows: [] }) },
    authHandoff: {
      async exchange({ code }) {
        exchangedCode = code
        return { accessToken: 'a', refreshToken: 'r', returnPath: '/dashboard' }
      }
    },
    logger: false
  })
  t.after(() => app.close())

  const response = await app.inject({
    method: 'POST', url: '/api/auth/handoff/exchange', payload: { code: 'one-time-code' }
  })
  assert.equal(response.statusCode, 200)
  assert.equal(exchangedCode, 'one-time-code')
  assert.deepEqual(response.json(), {
    accessToken: 'a', refreshToken: 'r', returnPath: '/dashboard'
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

test('starts Shopify store selection without asking for a myshopify domain', async t => {
  let selectionInput = null
  const app = buildApp({
    database: { query: async () => ({ rows: [] }) },
    verifyAccessToken: async () => ({ id: 'user-1' }),
    shopifyOAuth: {
      async beginStoreSelection(input) {
        selectionInput = input
        return {
          redirectUrl: 'https://admin.shopify.com/store-select',
          nonce: 'oauth-intent-1'
        }
      }
    },
    logger: false
  })
  t.after(() => app.close())

  const response = await app.inject({
    method: 'POST',
    url: '/api/shopify/connect',
    headers: { authorization: 'Bearer verified-token' },
    payload: { workspaceId: 'workspace-1' }
  })

  assert.equal(response.statusCode, 200)
  assert.equal(response.json().authorizationUrl, 'https://admin.shopify.com/store-select')
  assert.equal(selectionInput.user.id, 'user-1')
  assert.equal(selectionInput.workspaceId, 'workspace-1')
  assert.match(response.headers['set-cookie'], /yourprostore_shopify_intent=oauth-intent-1/)
  assert.match(response.headers['set-cookie'], /HttpOnly/)
  assert.match(response.headers['set-cookie'], /SameSite=Lax/)
})

test('continues OAuth for the store Shopify selected', async t => {
  let continuationInput = null
  const app = buildApp({
    database: { query: async () => ({ rows: [] }) },
    shopifyOAuth: {
      async continueStoreSelection(input) {
        continuationInput = input
        return 'https://selected-store.myshopify.com/admin/oauth/authorize'
      },
      installRedirect() {
        return 'http://127.0.0.1:5174/dashboard'
      }
    },
    logger: false
  })
  t.after(() => app.close())

  const response = await app.inject({
    method: 'GET',
    url: '/api/shopify/install?shop=selected-store.myshopify.com',
    headers: { cookie: 'yourprostore_shopify_intent=oauth-intent-1' }
  })

  assert.equal(response.statusCode, 302)
  assert.equal(response.headers.location, 'https://selected-store.myshopify.com/admin/oauth/authorize')
  assert.deepEqual(continuationInput, {
    shop: 'selected-store.myshopify.com',
    nonce: 'oauth-intent-1'
  })
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

test('returns the draft runtime config only with a host-bound preview token', async t => {
  let receivedParameters
  let receivedQuery
  const app = buildApp({
    database: {
      async query(query, parameters) {
        receivedQuery = query
        receivedParameters = parameters
        return { rows: [{ ...STOREFRONT_ROW, config_version: 4 }] }
      }
    },
    storefrontPreview: {
      verify(token) {
        assert.equal(token, 'valid-token')
        return {
          storefrontId: STOREFRONT_ROW.storefront_id,
          hostname: 'glowfield.co',
          exp: 1788343500
        }
      }
    },
    logger: false,
    shopifyApiVersion: '2026-07'
  })
  t.after(() => app.close())

  const response = await app.inject({
    method: 'GET',
    url: '/api/storefront/config',
    headers: {
      host: 'glowfield.co',
      authorization: 'StorefrontPreview valid-token'
    }
  })

  assert.equal(response.statusCode, 200)
  assert.deepEqual(receivedParameters, ['glowfield.co', STOREFRONT_ROW.storefront_id])
  assert.doesNotMatch(receivedQuery, /store_subscriptions/)
  assert.match(receivedQuery, /storefront[.]status in \('onboarding', 'active'\)/)
  assert.deepEqual(response.json().preview, {
    active: true,
    expiresAt: '2026-09-02T10:05:00.000Z'
  })
})

test('rejects a preview token issued for another hostname', async t => {
  const app = buildApp({
    database: { query: async () => ({ rows: [] }) },
    storefrontPreview: {
      verify: () => ({ storefrontId: 'storefront-1', hostname: 'other.example.com', exp: 1 })
    },
    logger: false
  })
  t.after(() => app.close())

  const response = await app.inject({
    method: 'GET',
    url: '/api/storefront/config?host=glowfield.co',
    headers: { host: 'glowfield.co', authorization: 'StorefrontPreview valid-token' }
  })

  assert.equal(response.statusCode, 403)
  assert.deepEqual(response.json(), { error: 'storefront_preview_scope_mismatch' })
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

test('creates Stripe Checkout only for the authenticated storefront user', async t => {
  let received = null
  const app = buildApp({
    database: { query: async () => ({ rows: [] }) },
    verifyAccessToken: async token => ({ id: 'user-1', email: `${token}@example.com` }),
    stripeBilling: {
      async createCheckout(input) {
        received = input
        return { checkoutUrl: 'https://checkout.stripe.test/session', sessionId: 'cs_test_1' }
      }
    },
    logger: false
  })
  t.after(() => app.close())

  const response = await app.inject({
    method: 'POST',
    url: '/api/storefronts/storefront-1/billing/checkout',
    headers: { authorization: 'Bearer owner' },
    payload: {}
  })

  assert.equal(response.statusCode, 200)
  assert.deepEqual(received, {
    userId: 'user-1',
    userEmail: 'owner@example.com',
    storefrontId: 'storefront-1'
  })
})

test('runs mock billing only through the configured mock service', async t => {
  let received = null
  const app = buildApp({
    database: { query: async () => ({ rows: [] }) },
    verifyAccessToken: async () => ({ id: 'user-1' }),
    billingProvider: 'mock',
    mockBilling: {
      async simulate(input) {
        received = input
        return { provider: 'mock', action: input.action, status: 'active' }
      }
    },
    logger: false
  })
  t.after(() => app.close())

  const response = await app.inject({
    method: 'POST',
    url: '/api/storefronts/storefront-1/billing/mock',
    headers: { authorization: 'Bearer test-token' },
    payload: { action: 'activate' }
  })

  assert.equal(response.statusCode, 200)
  assert.deepEqual(received, {
    userId: 'user-1', storefrontId: 'storefront-1', action: 'activate'
  })
  assert.deepEqual(response.json(), {
    provider: 'mock', action: 'activate', status: 'active'
  })
})

test('passes the exact raw request body to Stripe signature verification', async t => {
  let received = null
  const app = buildApp({
    database: { query: async () => ({ rows: [] }) },
    stripeBilling: {
      async handleWebhook(input) {
        received = input
        return { processed: true }
      }
    },
    logger: false
  })
  t.after(() => app.close())
  const payload = '{"id":"evt_1", "type":"customer.subscription.updated"}'

  const response = await app.inject({
    method: 'POST',
    url: '/api/stripe/webhooks',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': 't=123,v1=signature'
    },
    payload
  })

  assert.equal(response.statusCode, 200)
  assert.equal(received.rawBody.toString('utf8'), payload)
  assert.equal(received.signature, 't=123,v1=signature')
})

test('sets security headers and keeps cross-origin API access credentialless', async t => {
  const app = buildApp({
    database: { query: async () => ({ rows: [] }) },
    logger: false
  })
  t.after(() => app.close())

  const response = await app.inject({
    method: 'OPTIONS',
    url: '/api/account',
    headers: {
      origin: 'https://merchant.example',
      'access-control-request-method': 'GET',
      'access-control-request-headers': 'authorization'
    }
  })

  assert.equal(response.statusCode, 204)
  assert.equal(response.headers['access-control-allow-origin'], '*')
  assert.equal(response.headers['access-control-allow-credentials'], undefined)
  assert.match(response.headers['access-control-allow-headers'], /authorization/i)
  assert.equal(response.headers['x-content-type-options'], 'nosniff')
  assert.equal(response.headers['x-frame-options'], 'SAMEORIGIN')
})

test('rejects JSON request bodies above the configured limit', async t => {
  const app = buildApp({
    database: { query: async () => ({ rows: [] }) },
    logger: false,
    requestBodyLimitBytes: 64
  })
  t.after(() => app.close())

  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/handoff/exchange',
    payload: { code: 'x'.repeat(100) }
  })

  assert.equal(response.statusCode, 413)
  assert.equal(response.json().code, 'FST_ERR_CTP_BODY_TOO_LARGE')
})

test('rate limits API clients without limiting health checks', async t => {
  const app = buildApp({
    database: { query: async () => ({ rows: [] }) },
    logger: false,
    rateLimitMax: 2,
    rateLimitWindowMs: 60_000
  })
  t.after(() => app.close())

  assert.equal((await app.inject('/api/account')).statusCode, 401)
  assert.equal((await app.inject('/api/account')).statusCode, 401)
  const limited = await app.inject('/api/account')
  assert.equal(limited.statusCode, 429)
  assert.equal(limited.json().error, 'rate_limit_exceeded')
  assert.ok(Number(limited.headers['retry-after']) > 0)

  assert.equal((await app.inject('/api/health')).statusCode, 200)
  assert.equal((await app.inject('/api/health')).statusCode, 200)
  assert.equal((await app.inject('/api/health')).statusCode, 200)
})

test('redacts access credentials from structured error logs', async t => {
  const chunks = []
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(chunk.toString())
      callback()
    }
  })
  const secret = 'shpat_must_never_reach_logs'
  const app = buildApp({
    database: { query: async () => ({ rows: [] }) },
    verifyAccessToken: async () => {
      const error = new Error('verification failed')
      error.accessToken = secret
      throw error
    },
    logger: { level: 'info', stream }
  })
  t.after(() => app.close())

  const response = await app.inject({
    method: 'GET',
    url: '/api/account',
    headers: { authorization: `Bearer ${secret}` }
  })

  assert.equal(response.statusCode, 503)
  assert.doesNotMatch(chunks.join(''), new RegExp(secret))
  assert.match(chunks.join(''), /\[REDACTED\]/)
})
