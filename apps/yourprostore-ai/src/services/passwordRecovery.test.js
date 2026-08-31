import assert from 'node:assert/strict'
import test from 'node:test'
import {
  passwordRecoveryRedirectUrl,
  requestPasswordRecovery,
  validateNewPassword
} from './passwordRecovery.js'

test('builds a fixed password recovery path on the current application origin', () => {
  assert.equal(
    passwordRecoveryRedirectUrl('http://127.0.0.1:5175/login'),
    'http://127.0.0.1:5175/update-password'
  )
  assert.equal(
    passwordRecoveryRedirectUrl('https://yourprostore.ai/account'),
    'https://yourprostore.ai/update-password'
  )
})

test('requires matching passwords with the configured minimum length', () => {
  assert.equal(validateNewPassword('short', 'short'), 'password_too_short')
  assert.equal(validateNewPassword('new-password', 'different-password'), 'password_confirmation_mismatch')
  assert.equal(validateNewPassword('new-password', 'new-password'), null)
})

test('sends a trimmed email only to the fixed recovery redirect', async () => {
  let received = null
  await requestPasswordRecovery({
    auth: {
      async resetPasswordForEmail(email, options) {
        received = { email, options }
        return { error: null }
      }
    }
  }, '  owner@example.com  ', 'http://127.0.0.1:5175/login')
  assert.deepEqual(received, {
    email: 'owner@example.com',
    options: { redirectTo: 'http://127.0.0.1:5175/update-password' }
  })
})
