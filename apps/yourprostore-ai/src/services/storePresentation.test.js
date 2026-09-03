import assert from 'node:assert/strict'
import test from 'node:test'

import { storeCardState } from './storePresentation.js'

test('opens management only for an active storefront with an active subscription', () => {
  assert.deepEqual(storeCardState({
    storefront: { status: 'active', subscription: { status: 'active', planKey: 'starter_monthly' } }
  }), { label: 'Manage store', statusLabel: 'Active', action: 'manage' })
})

test('sends an incomplete selected plan back to payment', () => {
  assert.deepEqual(storeCardState({
    storefront: { status: 'active', subscription: { status: 'incomplete', planKey: 'starter_monthly' } }
  }), { label: 'Complete payment', statusLabel: 'Payment incomplete', action: 'setup' })
})

test('labels failed billing states without affecting another store', () => {
  assert.equal(storeCardState({
    storefront: { status: 'suspended', subscription: { status: 'past_due' } }
  }).label, 'Fix payment')
  assert.equal(storeCardState({
    storefront: { status: 'onboarding', subscription: null }
  }).label, 'Continue setup')
})
