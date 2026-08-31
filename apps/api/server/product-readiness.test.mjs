import assert from 'node:assert/strict'
import test from 'node:test'

import { createProductReadinessService } from './product-readiness.mjs'

function readinessDatabase() {
  const calls = []
  return {
    calls,
    database: {
      async query(sql, parameters = []) {
        calls.push({ sql, parameters })
        if (sql.includes('credentials.storefront_public_access_token')) {
          return {
            rows: [{
              id: 'storefront-1',
              current_myshopify_domain: 'test-shop.myshopify.com',
              storefront_public_access_token: 'public-token'
            }]
          }
        }
        return { rows: [] }
      }
    }
  }
}

test('completes product readiness when Shopify returns a product', async () => {
  const { database, calls } = readinessDatabase()
  let request = null
  const service = createProductReadinessService({
    database,
    apiVersion: '2026-07',
    fetchImpl: async (url, options) => {
      request = { url, options }
      return {
        ok: true,
        async json() {
          return { data: { products: { nodes: [{ id: 'gid://shopify/Product/1' }] } } }
        }
      }
    }
  })

  const result = await service.check({ userId: 'user-1', storefrontId: 'storefront-1' })

  assert.equal(result.ready, true)
  assert.equal(result.minimumProductCount, 1)
  assert.equal(result.productsAdminUrl, 'https://admin.shopify.com/store/test-shop/products')
  assert.equal(request.url, 'https://test-shop.myshopify.com/api/2026-07/graphql.json')
  assert.equal(request.options.headers['x-shopify-storefront-access-token'], 'public-token')
  const progress = calls.find(call => call.sql.includes('insert into public.onboarding_progress'))
  assert.deepEqual(progress.parameters, ['storefront-1', 'completed', true])
})

test('keeps product readiness in progress when Shopify has no published product', async () => {
  const { database, calls } = readinessDatabase()
  const service = createProductReadinessService({
    database,
    fetchImpl: async () => ({
      ok: true,
      async json() { return { data: { products: { nodes: [] } } } }
    })
  })

  const result = await service.check({ userId: 'user-1', storefrontId: 'storefront-1' })

  assert.equal(result.ready, false)
  const progress = calls.find(call => call.sql.includes('insert into public.onboarding_progress'))
  assert.deepEqual(progress.parameters, ['storefront-1', 'in_progress', false])
})

test('does not call Shopify for an inaccessible storefront', async () => {
  let fetchCalled = false
  const service = createProductReadinessService({
    database: { async query() { return { rows: [] } } },
    fetchImpl: async () => { fetchCalled = true }
  })

  await assert.rejects(
    service.check({ userId: 'user-1', storefrontId: 'storefront-1' }),
    { message: 'storefront_access_denied' }
  )
  assert.equal(fetchCalled, false)
})
