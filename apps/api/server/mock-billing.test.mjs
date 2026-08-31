import assert from 'node:assert/strict'
import test from 'node:test'

import { createMockBillingService, mockBillingStatusForAction } from './mock-billing.mjs'

function mockDatabase({ role = 'owner', planKey = 'starter_monthly', previousStatus = 'incomplete' } = {}) {
  const calls = []
  const client = {
    async query(sql, parameters = []) {
      calls.push({ sql, parameters })
      if (sql.includes('select storefront.id, store.workspace_id')) {
        return {
          rows: [{
            id: 'storefront-1',
            workspace_id: 'workspace-1',
            workspace_role: role
          }]
        }
      }
      if (sql.includes('select plan_key, status::text')) {
        return { rows: planKey ? [{ plan_key: planKey, status: previousStatus }] : [] }
      }
      return { rows: [] }
    },
    release() { calls.push({ sql: 'release', parameters: [] }) }
  }
  return {
    calls,
    database: { async connect() { return client } }
  }
}

test('maps supported mock billing actions to subscription states', () => {
  assert.equal(mockBillingStatusForAction('activate'), 'active')
  assert.equal(mockBillingStatusForAction('reactivate'), 'active')
  assert.equal(mockBillingStatusForAction('payment_failed'), 'past_due')
  assert.equal(mockBillingStatusForAction('cancel'), 'canceled')
  assert.equal(mockBillingStatusForAction('pause'), 'paused')
  assert.equal(mockBillingStatusForAction('unknown'), null)
})

test('activates only the selected storefront subscription and writes an audit log', async () => {
  const { database, calls } = mockDatabase()
  const billing = createMockBillingService({ database })

  const result = await billing.simulate({
    userId: 'user-1', storefrontId: 'storefront-1', action: 'activate'
  })

  assert.deepEqual(result, {
    provider: 'mock', action: 'activate', status: 'active', storefrontId: 'storefront-1'
  })
  const subscriptionUpdate = calls.find(call => call.sql.includes('update public.store_subscriptions'))
  assert.equal(subscriptionUpdate.parameters[0], 'storefront-1')
  assert.equal(subscriptionUpdate.parameters[1], 'active')
  assert.match(subscriptionUpdate.sql, /\$2::text = any\(\$3::text\[\]\)/)
  const storefrontUpdate = calls.find(call => call.sql.includes('update public.storefronts'))
  assert.match(storefrontUpdate.sql, /\$2::text = any\(\$3::text\[\]\)/)
  const auditInsert = calls.find(call => call.sql.includes('insert into private.audit_logs'))
  assert.equal(auditInsert.parameters[2], 'billing.mock.activate')
  assert.deepEqual(auditInsert.parameters[4], {
    previousStatus: 'incomplete', status: 'active'
  })
  assert.ok(calls.some(call => call.sql === 'commit'))
})

test('denies mock billing changes to a viewer', async () => {
  const { database, calls } = mockDatabase({ role: 'viewer' })
  const billing = createMockBillingService({ database })

  await assert.rejects(
    billing.simulate({ userId: 'viewer-1', storefrontId: 'storefront-1', action: 'activate' }),
    { message: 'storefront_billing_denied' }
  )
  assert.equal(calls.some(call => call.sql.includes('update public.store_subscriptions')), false)
  assert.ok(calls.some(call => call.sql === 'rollback'))
})

test('requires a selected store plan before mock activation', async () => {
  const { database } = mockDatabase({ planKey: null })
  const billing = createMockBillingService({ database })

  await assert.rejects(
    billing.simulate({ userId: 'user-1', storefrontId: 'storefront-1', action: 'activate' }),
    { message: 'store_plan_not_selected' }
  )
})

test('a billing action for one storefront does not target another storefront', async () => {
  const calls = []
  const subscriptions = new Map([
    ['storefront-a', { plan_key: 'starter_monthly', status: 'incomplete' }],
    ['storefront-b', { plan_key: 'starter_monthly', status: 'active' }]
  ])
  const client = {
    async query(sql, parameters = []) {
      calls.push({ sql, parameters })
      if (sql.includes('select storefront.id, store.workspace_id')) {
        return { rows: [{
          id: parameters[0], workspace_id: 'workspace-1', workspace_role: 'owner'
        }] }
      }
      if (sql.includes('select plan_key, status::text')) {
        return { rows: [subscriptions.get(parameters[0])] }
      }
      if (sql.includes('update public.store_subscriptions')) {
        subscriptions.get(parameters[0]).status = parameters[1]
      }
      return { rows: [] }
    },
    release() {}
  }
  const billing = createMockBillingService({
    database: { async connect() { return client } }
  })

  await billing.simulate({
    userId: 'user-1', storefrontId: 'storefront-a', action: 'activate'
  })

  assert.equal(subscriptions.get('storefront-a').status, 'active')
  assert.equal(subscriptions.get('storefront-b').status, 'active')
  const scopedWrites = calls.filter(call => (
    call.sql.includes('update public.store_subscriptions') ||
    call.sql.includes('update public.storefronts')
  ))
  assert.ok(scopedWrites.length >= 2)
  assert.ok(scopedWrites.every(call => call.parameters[0] === 'storefront-a'))
})
