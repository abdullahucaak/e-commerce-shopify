import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import test from 'node:test'
import {
  createShopifyWebhookService,
  verifyShopifyWebhookHmac
} from './shopify-webhooks.mjs'

const secret = 'test-secret'
const rawBody = Buffer.from(JSON.stringify({ id: 123, name: 'Updated shop' }))

function hmac(body = rawBody) {
  return createHmac('sha256', secret).update(body).digest('base64')
}

function headers(overrides = {}) {
  return {
    'x-shopify-hmac-sha256': hmac(),
    'x-shopify-topic': 'shop/update',
    'x-shopify-webhook-id': 'webhook-1',
    'x-shopify-api-version': '2026-07',
    'x-shopify-shop-domain': 'example.myshopify.com',
    ...overrides
  }
}

test('verifies the raw Shopify webhook body with current or previous secret', () => {
  assert.equal(verifyShopifyWebhookHmac(rawBody, hmac(), [secret]), true)
  assert.equal(verifyShopifyWebhookHmac(rawBody, hmac(), ['wrong', secret]), true)
  assert.equal(verifyShopifyWebhookHmac(Buffer.from('{}'), hmac(), [secret]), false)
})

test('rejects a webhook with an invalid signature before database access', async () => {
  const database = { query: () => assert.fail('database must not be queried') }
  const service = createShopifyWebhookService({ database, clientSecret: secret })

  await assert.rejects(
    service.handle({ rawBody, headers: headers({ 'x-shopify-hmac-sha256': 'invalid' }) }),
    /invalid_shopify_webhook_hmac/
  )
})

test('processes a shop update and records the event once', async () => {
  const calls = []
  const database = {
    async query(sql, params) {
      calls.push({ sql, params })
      if (sql.includes('select distinct store.id')) return { rows: [{ id: 'store-1' }] }
      if (sql.includes('insert into private.webhook_events')) return { rows: [{ id: 'event-1' }] }
      return { rows: [] }
    }
  }
  const service = createShopifyWebhookService({ database, clientSecret: secret })
  const result = await service.handle({ rawBody, headers: headers() })

  assert.deepEqual(result, { accepted: true, topic: 'shop/update' })
  assert.equal(calls.some(call => call.sql.includes("status = 'processed'")), true)
  assert.equal(calls.some(call => call.sql.includes('current_myshopify_domain = $2')), true)
})

test('acknowledges a duplicate webhook without applying changes again', async () => {
  let queryCount = 0
  const database = {
    async query(sql) {
      queryCount += 1
      if (sql.includes('select distinct store.id')) return { rows: [{ id: 'store-1' }] }
      if (sql.includes('insert into private.webhook_events')) return { rows: [] }
      if (sql.includes('select status, attempt_count')) {
        return { rows: [{ status: 'processed', attempt_count: 1 }] }
      }
      assert.fail('duplicate webhook must not change store data')
    }
  }
  const service = createShopifyWebhookService({ database, clientSecret: secret })
  const result = await service.handle({ rawBody, headers: headers() })

  assert.deepEqual(result, { accepted: true, duplicate: true })
  assert.equal(queryCount, 3)
})

test('suspends an uninstalled storefront and removes its Shopify credential atomically', async () => {
  const calls = []
  const client = {
    async query(sql) { calls.push(sql); return { rows: [] } },
    release() { calls.push('release') }
  }
  const database = {
    async query(sql, params) {
      calls.push(sql)
      if (sql.includes('select distinct store.id')) return { rows: [{ id: 'store-1' }] }
      if (sql.includes('insert into private.webhook_events')) return { rows: [{ id: 'event-1', attempt_count: 1 }] }
      return { rows: [] }
    },
    async connect() { return client }
  }
  const body = Buffer.from(JSON.stringify({ id: 123 }))
  const service = createShopifyWebhookService({ database, clientSecret: secret })
  const result = await service.handle({
    rawBody: body,
    headers: headers({
      'x-shopify-topic': 'app/uninstalled',
      'x-shopify-hmac-sha256': hmac(body)
    })
  })

  assert.deepEqual(result, { accepted: true, topic: 'app/uninstalled' })
  assert.equal(calls.some(sql => sql.includes("status = 'uninstalled'")), true)
  assert.equal(calls.some(sql => sql.includes("status = 'suspended'")), true)
  assert.equal(calls.some(sql => sql.includes('delete from private.shopify_credentials')), true)
  assert.ok(calls.indexOf('begin') < calls.indexOf('commit'))
})

test('records privacy requests without retaining their customer payload', async () => {
  const calls = []
  const body = Buffer.from(JSON.stringify({ customer: { id: 999, email: 'private@example.com' } }))
  const database = {
    async query(sql, params) {
      calls.push({ sql, params })
      if (sql.includes('select distinct store.id')) return { rows: [] }
      if (sql.includes('insert into private.webhook_events')) return { rows: [{ id: 'event-1', attempt_count: 1 }] }
      return { rows: [] }
    }
  }
  const service = createShopifyWebhookService({ database, clientSecret: secret })
  const result = await service.handle({
    rawBody: body,
    headers: headers({
      'x-shopify-topic': 'customers/data_request',
      'x-shopify-hmac-sha256': hmac(body)
    })
  })

  assert.deepEqual(result, { accepted: true, topic: 'customers/data_request' })
  const insert = calls.find(call => call.sql.includes('insert into private.webhook_events'))
  assert.equal(insert.params[4], null)
})

test('routes shop redaction through the destructive data cleanup service', async () => {
  let redacted = null
  const body = Buffer.from(JSON.stringify({ shop_id: 123, shop_domain: 'example.myshopify.com' }))
  const database = {
    async query(sql) {
      if (sql.includes('select distinct store.id')) return { rows: [{ id: 'store-1' }] }
      if (sql.includes('insert into private.webhook_events')) return { rows: [{ id: 'event-1', attempt_count: 1 }] }
      return { rows: [] }
    }
  }
  const service = createShopifyWebhookService({
    database,
    clientSecret: secret,
    shopDataRedactor: { async redact(input) { redacted = input } }
  })
  const result = await service.handle({
    rawBody: body,
    headers: headers({
      'x-shopify-topic': 'shop/redact',
      'x-shopify-hmac-sha256': hmac(body)
    })
  })

  assert.deepEqual(result, { accepted: true, topic: 'shop/redact' })
  assert.deepEqual(redacted, { shopifyStoreId: 'store-1' })
})

test('reclaims a failed webhook and dead-letters an exhausted delivery', async () => {
  let failedStatus = null
  const database = {
    async query(sql, params) {
      if (sql.includes('select distinct store.id')) return { rows: [{ id: 'store-1' }] }
      if (sql.includes('insert into private.webhook_events')) {
        return { rows: [{ id: 'event-1', attempt_count: 8 }] }
      }
      if (sql.includes('update public.shopify_stores set')) throw new Error('temporary_database_failure')
      if (sql.includes('update private.webhook_events') && sql.includes('next_attempt_at')) {
        failedStatus = params[1]
      }
      return { rows: [] }
    }
  }
  const service = createShopifyWebhookService({ database, clientSecret: secret })

  await assert.rejects(service.handle({ rawBody, headers: headers() }), /temporary_database_failure/)
  assert.equal(failedStatus, 'dead_letter')
})
