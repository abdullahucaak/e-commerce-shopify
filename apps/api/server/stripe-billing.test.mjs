import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createStripeBillingService,
  normalizeStripeSubscriptionStatus
} from './stripe-billing.mjs'

function checkoutDatabase(subscription, workspaceRole = 'owner') {
  const calls = []
  const client = {
    async query(sql, parameters = []) {
      calls.push({ sql, parameters })
      if (sql.includes('select storefront.id')) {
        return { rows: [{ id: 'storefront-1', workspace_role: workspaceRole }] }
      }
      if (sql.includes('from public.store_subscriptions') && sql.includes('for update')) {
        return { rows: [subscription] }
      }
      return { rows: [] }
    },
    release() { calls.push({ sql: 'release', parameters: [] }) }
  }
  return {
    calls,
    database: {
      async query() { return { rows: [] } },
      async connect() { return client }
    }
  }
}

test('maps every Stripe subscription state to a supported store state', () => {
  assert.equal(normalizeStripeSubscriptionStatus('active'), 'active')
  assert.equal(normalizeStripeSubscriptionStatus('unpaid'), 'past_due')
  assert.equal(normalizeStripeSubscriptionStatus('incomplete_expired'), 'canceled')
  assert.equal(normalizeStripeSubscriptionStatus('unknown_future_state'), 'incomplete')
})

test('creates one store-scoped Stripe Checkout session with subscription metadata', async () => {
  const stripeCalls = []
  const { database, calls } = checkoutDatabase({
    plan_key: 'starter_monthly',
    status: 'incomplete',
    provider_customer_id: null,
    provider_subscription_id: null,
    provider_checkout_session_id: null,
    provider_checkout_url: null,
    checkout_expires_at: null,
    checkout_attempt: 0
  })
  const stripeClient = {
    checkout: {
      sessions: {
        async create(input, options) {
          stripeCalls.push({ input, options })
          return {
            id: 'cs_test_storefront_1',
            url: 'https://checkout.stripe.test/session',
            expires_at: 2_000_000_000
          }
        }
      }
    },
    billingPortal: { sessions: { create: async () => ({}) } },
    prices: {
      retrieve: async () => ({
        active: true, type: 'recurring', recurring: { interval: 'month' },
        currency: 'usd', unit_amount: 900
      })
    },
    subscriptions: { retrieve: async () => ({}) },
    webhooks: { constructEvent: () => ({}) }
  }
  const billing = createStripeBillingService({
    database,
    webhookSecret: 'whsec_test',
    yourProStoreUrl: 'https://app.example.com',
    priceIds: { starter_monthly: 'price_starter' },
    stripeClient
  })

  const result = await billing.createCheckout({
    userId: 'user-1',
    userEmail: 'owner@example.com',
    storefrontId: 'storefront-1'
  })

  assert.equal(result.checkoutUrl, 'https://checkout.stripe.test/session')
  assert.equal(stripeCalls.length, 1)
  assert.equal(stripeCalls[0].input.mode, 'subscription')
  assert.equal(stripeCalls[0].input.line_items[0].price, 'price_starter')
  assert.equal(stripeCalls[0].input.metadata.storefront_id, 'storefront-1')
  assert.equal(stripeCalls[0].input.subscription_data.metadata.storefront_id, 'storefront-1')
  assert.match(stripeCalls[0].input.success_url, /session_id=\{CHECKOUT_SESSION_ID\}$/)
  assert.equal(stripeCalls[0].options.idempotencyKey, 'storefront:storefront-1:checkout:1')
  assert.ok(calls.some(call => call.sql.includes('provider_checkout_session_id = $2')))
  assert.ok(calls.some(call => call.sql === 'commit'))
})

test('reuses an unexpired Checkout session for the same store', async () => {
  let stripeCalled = false
  const { database } = checkoutDatabase({
    plan_key: 'starter_monthly',
    status: 'incomplete',
    provider_customer_id: null,
    provider_subscription_id: null,
    provider_checkout_session_id: 'cs_test_existing',
    provider_checkout_url: 'https://checkout.stripe.test/existing',
    checkout_expires_at: new Date(Date.now() + 60_000),
    checkout_attempt: 1
  })
  const billing = createStripeBillingService({
    database,
    webhookSecret: 'whsec_test',
    yourProStoreUrl: 'https://app.example.com',
    priceIds: { starter_monthly: 'price_starter' },
    stripeClient: {
      checkout: { sessions: { create: async () => { stripeCalled = true } } },
      billingPortal: { sessions: { create: async () => ({}) } },
      prices: { retrieve: async () => ({}) },
      subscriptions: { retrieve: async () => ({}) },
      webhooks: { constructEvent: () => ({}) }
    }
  })

  const result = await billing.createCheckout({
    userId: 'user-1', userEmail: null, storefrontId: 'storefront-1'
  })

  assert.equal(result.reused, true)
  assert.equal(result.sessionId, 'cs_test_existing')
  assert.equal(stripeCalled, false)
})

test('denies billing changes to a non-owner workspace member', async () => {
  const { database } = checkoutDatabase({ plan_key: 'starter_monthly' }, 'viewer')
  const billing = createStripeBillingService({
    database,
    webhookSecret: 'whsec_test',
    yourProStoreUrl: 'https://app.example.com',
    priceIds: { starter_monthly: 'price_starter' },
    stripeClient: {
      checkout: { sessions: { create: async () => assert.fail('Stripe must not be called') } },
      billingPortal: { sessions: { create: async () => ({}) } },
      prices: { retrieve: async () => ({}) },
      subscriptions: { retrieve: async () => ({}) },
      webhooks: { constructEvent: () => ({}) }
    }
  })

  await assert.rejects(
    billing.createCheckout({ userId: 'viewer-1', userEmail: null, storefrontId: 'storefront-1' }),
    { message: 'storefront_billing_denied' }
  )
})

test('applies a signed subscription webhook once and scopes it to one storefront', async () => {
  const calls = []
  const rawBody = Buffer.from('{"id":"evt_1"}')
  const event = {
    id: 'evt_1',
    type: 'customer.subscription.updated',
    created: 2_000_000_000,
    livemode: false,
    data: {
      object: {
        id: 'sub_storefront_1',
        status: 'active',
        customer: 'cus_storefront_1',
        metadata: { storefront_id: 'storefront-1' },
        cancel_at_period_end: false,
        canceled_at: null,
        items: { data: [{ current_period_start: 2_000_000_000, current_period_end: 2_002_592_000 }] }
      }
    }
  }
  const client = {
    async query(sql, parameters = []) {
      calls.push({ sql, parameters })
      if (sql.includes('insert into private.stripe_webhook_events')) {
        return { rows: [{ stripe_event_id: event.id }] }
      }
      if (sql.includes('select storefront_id::text')) {
        return { rows: [{ storefront_id: 'storefront-1', provider_subscription_id: null }] }
      }
      if (sql.includes('update public.store_subscriptions')) {
        return { rows: [{ storefront_id: 'storefront-1' }] }
      }
      return { rows: [] }
    },
    release() {}
  }
  const database = {
    async query() { return { rows: [] } },
    async connect() { return client }
  }
  const billing = createStripeBillingService({
    database,
    webhookSecret: 'whsec_test',
    yourProStoreUrl: 'https://app.example.com',
    priceIds: { starter_monthly: 'price_starter' },
    stripeClient: {
      checkout: { sessions: { create: async () => ({}) } },
      billingPortal: { sessions: { create: async () => ({}) } },
      prices: { retrieve: async () => ({}) },
      subscriptions: { retrieve: async () => ({}) },
      webhooks: {
        constructEvent(receivedBody, signature, secret) {
          assert.strictEqual(receivedBody, rawBody)
          assert.equal(signature, 'stripe-signature')
          assert.equal(secret, 'whsec_test')
          return event
        }
      }
    }
  })

  const result = await billing.handleWebhook({ rawBody, signature: 'stripe-signature' })

  assert.equal(result.storefrontId, 'storefront-1')
  assert.equal(result.status, 'active')
  const subscriptionUpdate = calls.find(call => call.sql.includes('update public.store_subscriptions'))
  assert.equal(subscriptionUpdate.parameters[0], 'storefront-1')
  assert.equal(subscriptionUpdate.parameters[1], 'active')
  assert.ok(calls.some(call => call.sql.includes('update public.storefronts storefront')))
  assert.ok(calls.some(call => call.sql.includes('processed_at = now()')))
})

test('acknowledges a duplicate Stripe event without applying it twice', async () => {
  const calls = []
  const event = {
    id: 'evt_duplicate', type: 'customer.subscription.deleted', created: 2_000_000_000,
    livemode: false,
    data: { object: { id: 'sub_1', status: 'canceled', metadata: { storefront_id: 'storefront-1' } } }
  }
  const client = {
    async query(sql) {
      calls.push(sql)
      if (sql.includes('insert into private.stripe_webhook_events')) return { rows: [] }
      return { rows: [] }
    },
    release() {}
  }
  const billing = createStripeBillingService({
    database: {
      async query() { return { rows: [] } },
      async connect() { return client }
    },
    webhookSecret: 'whsec_test',
    yourProStoreUrl: 'https://app.example.com',
    priceIds: { starter_monthly: 'price_starter' },
    stripeClient: {
      checkout: { sessions: { create: async () => ({}) } },
      billingPortal: { sessions: { create: async () => ({}) } },
      prices: { retrieve: async () => ({}) },
      subscriptions: { retrieve: async () => ({}) },
      webhooks: { constructEvent: () => event }
    }
  })

  const result = await billing.handleWebhook({ rawBody: Buffer.from('{}'), signature: 'signature' })

  assert.deepEqual(result, { duplicate: true })
  assert.equal(calls.some(sql => sql.includes('update public.store_subscriptions')), false)
})
