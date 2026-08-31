import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveStorefrontAdminPermissions } from './cmsPermissions.js'

test('uses API-provided storefront-admin permissions', () => {
  assert.deepEqual(resolveStorefrontAdminPermissions({
    role: 'owner',
    storefrontAdminPermissions: {
      designWrite: false,
      contentWrite: false,
      domainsWrite: false
    }
  }), {
    designWrite: false,
    contentWrite: false,
    domainsWrite: false
  })
})

test('falls back to the documented role matrix for older API responses', () => {
  assert.deepEqual(resolveStorefrontAdminPermissions({ role: 'editor' }), {
    designWrite: false,
    contentWrite: true,
    domainsWrite: false
  })
  assert.deepEqual(resolveStorefrontAdminPermissions({ role: 'viewer' }), {
    designWrite: false,
    contentWrite: false,
    domainsWrite: false
  })
})

test('fails closed for an unknown role', () => {
  assert.deepEqual(resolveStorefrontAdminPermissions({ role: 'unexpected' }), {
    designWrite: false,
    contentWrite: false,
    domainsWrite: false
  })
})
