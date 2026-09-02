import assert from 'node:assert/strict'
import test from 'node:test'
import { buildApp } from './app.mjs'
import { DEFAULT_STOREFRONT_CONTENT } from './content-config.mjs'

test('fails closed across every storefront route family for another tenant id', async t => {
  let writes = 0
  const deniedClient = {
    async query(sql) {
      if (sql === 'begin' || sql === 'rollback') return { rows: [] }
      if (/^(insert|update|delete)\b/i.test(sql.trim())) writes += 1
      return { rows: [] }
    },
    release() {}
  }
  const denied = async () => { throw new Error('storefront_access_denied') }
  const database = {
    async query(sql) {
      if (/^(insert|update|delete)\b/i.test(sql.trim())) writes += 1
      return { rows: [] }
    },
    async connect() { return deniedClient }
  }
  const app = buildApp({
    database,
    verifyAccessToken: async () => ({ id: 'tenant-a-user' }),
    storefrontPreview: { issue: denied, verify: denied },
    productReadiness: { check: denied },
    stripeBilling: { createCheckout: denied, createPortal: denied },
    mockBilling: { simulate: denied },
    shopifyDomains: { read: async () => null, sync: denied },
    storefrontAssets: { remove: denied },
    logger: false
  })
  t.after(() => app.close())

  const auth = { authorization: 'Bearer tenant-a-token' }
  const design = {
    name: 'Tenant A', logoUrl: '', logoSize: 180,
    colors: { primary: '#112233', secondary: '#445566' },
    announcement: { enabled: true, text: 'Tenant A announcement' }
  }
  const cases = [
    ['GET', '/api/storefronts/tenant-b/onboarding', null, 404],
    ['PATCH', '/api/storefronts/tenant-b/onboarding/niche', { nicheId: 'home_living' }, 403],
    ['PATCH', '/api/storefronts/tenant-b/onboarding/banner', { bannerPresetId: 'minimal_home' }, 403],
    ['PATCH', '/api/storefronts/tenant-b/onboarding/brand', design, 403],
    ['PATCH', '/api/storefronts/tenant-b/onboarding/preview', {}, 403],
    ['POST', '/api/storefronts/tenant-b/onboarding/products/check', {}, 403],
    ['PATCH', '/api/storefronts/tenant-b/onboarding/domain/skip', {}, 403],
    ['PATCH', '/api/storefronts/tenant-b/onboarding/plan', { planKey: 'starter_monthly' }, 403],
    ['POST', '/api/storefronts/tenant-b/onboarding/complete', {}, 403],
    ['POST', '/api/storefronts/tenant-b/billing/checkout', {}, 403],
    ['POST', '/api/storefronts/tenant-b/billing/mock', { action: 'activate' }, 403],
    ['POST', '/api/storefronts/tenant-b/billing/portal', {}, 403],
    ['GET', '/api/storefronts/tenant-b/design', null, 404],
    ['PUT', '/api/storefronts/tenant-b/design', design, 403],
    ['POST', '/api/storefronts/tenant-b/design/publish', {}, 403],
    ['GET', '/api/storefronts/tenant-b/content', null, 404],
    ['PUT', '/api/storefronts/tenant-b/content', DEFAULT_STOREFRONT_CONTENT, 403],
    ['POST', '/api/storefronts/tenant-b/content/publish', {}, 403],
    ['POST', '/api/storefronts/tenant-b/preview', {}, 403],
    ['GET', '/api/storefronts/tenant-b/config-versions', null, 404],
    ['POST', '/api/storefronts/tenant-b/config-versions/1/restore', {}, 403],
    ['GET', '/api/storefronts/tenant-b/domains', null, 404],
    ['POST', '/api/storefronts/tenant-b/domains/sync', {}, 403],
    ['DELETE', '/api/storefronts/tenant-b/assets', {
      path: 'tenant-b/about/11111111-1111-4111-8111-111111111111.webp'
    }, 403]
  ]

  for (const [method, url, payload, expectedStatus] of cases) {
    const response = await app.inject({ method, url, headers: auth, ...(payload ? { payload } : {}) })
    assert.equal(response.statusCode, expectedStatus, `${method} ${url}: ${response.body}`)
  }
  assert.equal(writes, 0)
})
