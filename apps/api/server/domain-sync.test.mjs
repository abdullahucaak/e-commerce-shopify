import assert from 'node:assert/strict'
import test from 'node:test'
import { createShopifyDomainService } from './domain-sync.mjs'
import { encryptAdminToken } from './shopify-oauth.mjs'

test('audits a customer-triggered domain synchronization in the same transaction', async t => {
  const encryptionSecret = 'domain-test-encryption-secret'
  const queries = []
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return { data: { shop: {
        primaryDomain: { host: 'www.example.com', sslEnabled: true },
        myshopifyDomain: 'example.myshopify.com'
      } } }
    }
  })
  t.after(() => { globalThis.fetch = originalFetch })

  const row = {
    storefront_id: '11111111-1111-4111-8111-111111111111',
    shopify_store_id: '22222222-2222-4222-8222-222222222222',
    workspace_id: '33333333-3333-4333-8333-333333333333',
    current_myshopify_domain: 'example.myshopify.com',
    role: 'owner',
    admin_access_token_ciphertext: encryptAdminToken('shpat_test', encryptionSecret)
  }
  const client = {
    async query(sql, parameters = []) {
      queries.push({ sql, parameters })
      if (sql.includes('select hostname from public.store_domains')) return { rows: [] }
      return { rows: [] }
    },
    release() {}
  }
  const database = {
    async query(sql) {
      if (sql.includes('credentials.admin_access_token_ciphertext')) return { rows: [row] }
      if (sql.includes('left join public.store_domains')) return { rows: [{
        current_myshopify_domain: row.current_myshopify_domain,
        shopify_primary_domain: 'www.example.com'
      }] }
      throw new Error(`Unexpected pool query: ${sql}`)
    },
    async connect() { return client }
  }
  const service = createShopifyDomainService({ database, apiVersion: '2026-07', encryptionSecret })

  await service.sync({ userId: 'user-1', storefrontId: row.storefront_id })

  const audit = queries.find(query => query.sql.includes('insert into private.audit_logs'))
  assert.deepEqual(audit.parameters, [
    row.workspace_id,
    'user-1',
    'cms.domain.synced',
    row.storefront_id,
    {
      primaryHostname: 'www.example.com',
      hostnames: ['www.example.com', 'example.myshopify.com'],
      sslEnabled: true
    }
  ])
  assert.equal(queries.at(-1).sql, 'commit')
})
