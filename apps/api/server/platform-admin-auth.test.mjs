import assert from 'node:assert/strict'
import test from 'node:test'
import { authorizePlatformAdmin } from './platform-admin-auth.mjs'

test('requires both an active private platform admin record and aal2', async () => {
  const database = { query: async () => ({ rows: [{ role: 'owner', status: 'active', mfa_required: true }] }) }
  await assert.rejects(
    authorizePlatformAdmin({ database, user: { id: 'user-1', authContext: { aal: 'aal1' } } }),
    /platform_admin_mfa_required/
  )
  assert.deepEqual(await authorizePlatformAdmin({
    database,
    user: { id: 'user-1', email: 'admin@example.com', authContext: { aal: 'aal2' } }
  }), { userId: 'user-1', email: 'admin@example.com', role: 'owner' })
})

test('does not derive platform access from customer workspace or JWT metadata roles', async () => {
  const database = { query: async () => ({ rows: [] }) }
  await assert.rejects(authorizePlatformAdmin({
    database,
    user: {
      id: 'customer-owner',
      app_metadata: { role: 'platform_admin' },
      user_metadata: { role: 'owner' },
      authContext: { aal: 'aal2' }
    }
  }), /platform_admin_access_denied/)
})
