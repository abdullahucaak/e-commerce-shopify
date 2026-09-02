import assert from 'node:assert/strict'
import test from 'node:test'
import { createShopDataRedactor } from './shop-data-redaction.mjs'

test('removes storefront files before deleting redacted shop data transactionally', async () => {
  const fetchCalls = []
  const sql = []
  const client = {
    async query(query) { sql.push(query); return { rows: [] } },
    release() { sql.push('release') }
  }
  const database = {
    async query() {
      return { rows: [{ storage_path: 'storefront-1/logos/a.png' }, { storage_path: 'storefront-1/hero/b.webp' }] }
    },
    async connect() { return client }
  }
  const redactor = createShopDataRedactor({
    database,
    supabaseUrl: 'https://project.supabase.co/',
    serviceRoleKey: 'service-role-secret',
    fetchImpl: async (url, options) => { fetchCalls.push({ url, options }); return { ok: true } }
  })

  const result = await redactor.redact({ shopifyStoreId: 'store-1' })

  assert.deepEqual(result, { redacted: true, removedAssetCount: 2 })
  assert.deepEqual(JSON.parse(fetchCalls[0].options.body), {
    prefixes: ['storefront-1/logos/a.png', 'storefront-1/hero/b.webp']
  })
  assert.equal(fetchCalls[0].options.headers.authorization, 'Bearer service-role-secret')
  assert.ok(sql.some(query => query.includes('delete from public.shopify_stores')))
  assert.ok(sql.indexOf('begin') < sql.indexOf('commit'))
})

test('keeps database shop data when Storage redaction fails', async () => {
  let connected = false
  const database = {
    async query() { return { rows: [{ storage_path: 'storefront-1/logos/a.png' }] } },
    async connect() { connected = true; throw new Error('must not connect') }
  }
  const redactor = createShopDataRedactor({
    database,
    supabaseUrl: 'https://project.supabase.co',
    serviceRoleKey: 'service-role-secret',
    fetchImpl: async () => ({ ok: false })
  })

  await assert.rejects(redactor.redact({ shopifyStoreId: 'store-1' }), /shop_data_redaction_storage_failed/)
  assert.equal(connected, false)
})
