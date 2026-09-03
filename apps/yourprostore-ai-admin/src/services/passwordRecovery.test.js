import test from 'node:test'
import assert from 'node:assert/strict'
import {
  adminPasswordRecoveryRedirectUrl,
  requestAdminPasswordRecovery,
  validateAdminPassword
} from './passwordRecovery.js'

test('uses the fixed update-password path on the admin origin', () => {
  assert.equal(
    adminPasswordRecoveryRedirectUrl('https://admin.yourprostore.ai/login'),
    'https://admin.yourprostore.ai/update-password'
  )
})

test('validates minimum length and confirmation', () => {
  assert.equal(validateAdminPassword('short', 'short'), 'password_too_short')
  assert.equal(validateAdminPassword('new-password', 'different'), 'password_confirmation_mismatch')
  assert.equal(validateAdminPassword('new-password', 'new-password'), null)
})

test('sends only the trimmed email and fixed admin recovery redirect', async () => {
  let request
  const client = {
    auth: {
      async resetPasswordForEmail(email, options) {
        request = { email, options }
        return { error: null }
      }
    }
  }

  await requestAdminPasswordRecovery(client, ' admin@example.com ', 'https://admin.yourprostore.ai/login')
  assert.deepEqual(request, {
    email: 'admin@example.com',
    options: { redirectTo: 'https://admin.yourprostore.ai/update-password' }
  })
})
