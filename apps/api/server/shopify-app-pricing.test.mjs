import assert from 'node:assert/strict'
import test from 'node:test'

import { createShopifyAppPricingService } from './shopify-app-pricing.mjs'

function createFixture(activeSubscription) {
  const calls = []
  const store = {
    storefront_id: 'storefront-1',
    shopify_gid: 'gid://shopify/Shop/123',
    current_myshopify_domain: 'example.myshopify.com',
    workspace_role: 'owner'
  }
  const database = {
    async query(sql, parameters = []) {
      calls.push({ sql, parameters })
      if (sql.includes('membership.user_id')) return { rows: [store] }
      if (sql.includes('left join public.shopify_domain_aliases')) return { rows: [store] }
      return { rows: [] }
    }
  }
  const fetchCalls = []
  const service = createShopifyAppPricingService({
    database,
    organizationId: '5158610',
    appId: 'gid://shopify/App/456',
    appHandle: 'yourprostore-ai',
    accessToken: 'partner-token',
    yourProStoreUrl: 'https://yourprostore.ai',
    fetchImpl: async (url, options) => {
      fetchCalls.push({ url, options })
      return { ok: true, json: async () => ({ data: { activeSubscription } }) }
    }
  })
  return { calls, fetchCalls, service }
}

test('builds the Shopify-hosted plan selection URL for the connected store', async () => {
  const { service } = createFixture(null)
  const result = await service.createPlanSelection({ userId: 'user-1', storefrontId: 'storefront-1' })
  assert.equal(result.checkoutUrl, 'https://admin.shopify.com/store/example/charges/yourprostore-ai/pricing_plans')
})

test('confirms an active plan through the Partner API and stores minor currency units', async () => {
  const { calls, fetchCalls, service } = createFixture({
    billingPeriod: 'EVERY_30_DAYS',
    cancelAtEndOfCycle: false,
    trialEndsAt: null,
    currentBillingCycle: { startTime: '2026-09-01T00:00:00Z', endTime: '2026-10-01T00:00:00Z' },
    items: [{ handle: 'starter-monthly', price: { active: true, currency: 'USD', amount: '9.00' } }]
  })
  const result = await service.synchronize({ userId: 'user-1', storefrontId: 'storefront-1' })
  assert.deepEqual(result.subscription, {
    planKey: 'starter_monthly', status: 'active', unitAmount: 900, currencyCode: 'USD'
  })
  assert.equal(fetchCalls[0].url, 'https://partners.shopify.com/5158610/api/2026-07/graphql.json')
  const update = calls.find(call => call.sql.includes("provider = 'shopify_app_pricing'"))
  assert.equal(update.parameters[1], 'starter_monthly')
  assert.equal(update.parameters[3], 900)
})

test('accepts a callback only after the Partner API confirms the same plan', async () => {
  const { service } = createFixture({
    cancelAtEndOfCycle: false,
    trialEndsAt: null,
    currentBillingCycle: null,
    items: [{ handle: 'starter-monthly', price: { active: true, currency: 'USD', amount: '9' } }]
  })
  const result = await service.handleCallback({ shop: 'example.myshopify.com', planHandle: 'starter-monthly' })
  assert.equal(result.redirectUrl, 'https://yourprostore.ai/setup/storefront-1?billing=success')
})

test('does not trust an unconfirmed callback plan', async () => {
  const { service } = createFixture(null)
  await assert.rejects(
    service.handleCallback({ shop: 'example.myshopify.com', planHandle: 'starter-monthly' }),
    { message: 'shopify_pricing_not_active' }
  )
})
