import assert from 'node:assert/strict'
import test from 'node:test'

import { calculateSetupProgress, SETUP_STEP_KEYS } from './onboardingPresentation.js'

const completedSteps = SETUP_STEP_KEYS.map(step_key => ({ step_key, status: 'completed' }))

test('does not show 100 percent for a stale publish step without active billing', () => {
  assert.equal(calculateSetupProgress(completedSteps, 'incomplete'), 89)
  assert.equal(calculateSetupProgress(completedSteps, 'past_due'), 89)
})

test('shows 100 percent only when publish and billing are active', () => {
  assert.equal(calculateSetupProgress(completedSteps, 'active'), 100)
  assert.equal(calculateSetupProgress(completedSteps, 'trialing'), 100)
})

test('ignores unknown onboarding records', () => {
  assert.equal(calculateSetupProgress([
    { step_key: 'shopify_connection', status: 'completed' },
    { step_key: 'legacy_step', status: 'completed' }
  ], 'active'), 11)
})
