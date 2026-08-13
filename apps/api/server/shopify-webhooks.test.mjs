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
      assert.fail('duplicate webhook must not change store data')
    }
  }
  const service = createShopifyWebhookService({ database, clientSecret: secret })
  const result = await service.handle({ rawBody, headers: headers() })

  assert.deepEqual(result, { accepted: true, duplicate: true })
  assert.equal(queryCount, 2)
})
