import assert from 'node:assert/strict'
import test from 'node:test'
import { listPlatformOperations, listPlatformStores, listPlatformWorkspaces, readPlatformOverview, setPlatformCatalogActive } from './platform-admin-operations.mjs'

test('maps aggregate platform operations without returning tenant rows', async () => {
  const database = { query: async () => ({ rows: [{
    workspace_count: 2, shopify_store_count: 3, storefront_count: 3,
    active_subscription_count: 2, failed_webhook_count: 1, dead_letter_webhook_count: 0
  }] }) }
  assert.deepEqual(await readPlatformOverview({ database }), {
    workspaces: 2, shopifyStores: 3, storefronts: 3, activeSubscriptions: 2,
    failedWebhooks: 1, deadLetterWebhooks: 0
  })
})

test('lists bounded workspace summaries without auth metadata or secrets', async () => {
  let parameters
  const database = { query: async (_query, values) => {
    parameters = values
    return { rows: [{
      id: 'workspace-1', name: 'GlowField', created_at: '2026-09-01T10:00:00.000Z',
      total_count: 72, member_count: 2, store_count: 3, owner_email: 'owner@example.com'
    }] }
  } }
  assert.deepEqual(await listPlatformWorkspaces({ database, page: '2', pageSize: '500' }), {
    items: [{ id: 'workspace-1', name: 'GlowField', ownerEmail: 'owner@example.com',
      memberCount: 2, storeCount: 3, createdAt: '2026-09-01T10:00:00.000Z' }],
    page: 2, pageSize: 50, total: 72
  })
  assert.deepEqual(parameters, [50, 50])
})

test('maps store operations without provider identifiers or credentials', async () => {
  const database = { query: async () => ({ rows: [{
    id: 'store-1', shop_name: 'GlowField', current_myshopify_domain: 'glow.myshopify.com',
    status: 'active', workspace_id: 'workspace-1', workspace_name: 'Glow',
    storefront_id: 'front-1', storefront_status: 'active', plan_key: 'starter_monthly',
    subscription_status: 'active', current_period_end: null, cancel_at_period_end: false,
    onboarding_completed: 9, onboarding_total: 9, total_count: 1
  }] }) }
  const result = await listPlatformStores({ database })
  assert.equal(result.items[0].subscription.status, 'active')
  assert.deepEqual(result.items[0].onboarding, { completed: 9, total: 9 })
  assert.equal(JSON.stringify(result).includes('provider'), false)
})

test('omits payload and metadata while redacting operation errors', async () => {
  let call=0;const database={query:async()=>++call===1?{rows:[{id:'w',topic:'shop/update',status:'failed',attempt_count:2,error_message:'Bearer secret-value',received_at:'now'}]}:{rows:[{id:'a',action:'test',target_type:'store',created_at:'now'}]}}
  const result=await listPlatformOperations({database})
  assert.equal(result.webhooks[0].errorMessage,'Bearer [REDACTED]')
  assert.equal(JSON.stringify(result).includes('payload'),false)
  assert.equal(JSON.stringify(result).includes('metadata'),false)
})

test('catalog writes require owner/admin and commit an audit transaction',async()=>{await assert.rejects(setPlatformCatalogActive({database:{},admin:{role:'support'}}),/write_denied/);const calls=[];const client={query:async(sql)=>{calls.push(sql);return sql.startsWith('update')?{rows:[{id:'x'}]}:{rows:[]}},release(){}};const database={connect:async()=>client};await setPlatformCatalogActive({database,admin:{role:'owner',userId:'u'},kind:'niche',id:'398dc261-e323-468b-ac65-dc20e9b71ee7',active:false,reason:'Katalog bakımı'});assert.ok(calls.some(sql=>sql.includes('private.audit_logs')));assert.equal(calls.at(-1),'commit')})
