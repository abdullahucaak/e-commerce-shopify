import assert from 'node:assert/strict'
import test from 'node:test'

import { deploymentContracts, validateDeploymentEnvironment } from './validate-deployment-env.mjs'

function validEnvironment(target) {
  const env = Object.fromEntries(deploymentContracts[target].map(name => [name, 'configured']))
  for (const name of deploymentContracts[target]) {
    if (name.includes('URL')) env[name] = 'https://example.com'
  }
  if (target === 'api') {
    Object.assign(env, {
      APP_ENV: 'staging', API_HOST: '0.0.0.0', BILLING_PROVIDER: 'mock',
      ALLOW_MOCK_BILLING: 'true'
    })
  }
  return env
}

test('each deployment target reports its missing variables', () => {
  for (const [target, variables] of Object.entries(deploymentContracts)) {
    const failures = validateDeploymentEnvironment(target, {})
    assert.equal(failures.filter(item => item.includes('is required')).length, variables.length)
  }
})

test('accepts complete frontend contracts', () => {
  for (const target of ['platform', 'storefront-admin', 'platform-admin', 'storefront']) {
    assert.deepEqual(validateDeploymentEnvironment(target, validEnvironment(target)), [])
  }
})

test('allows mock billing only in explicitly enabled staging', () => {
  const staging = validEnvironment('api')
  assert.deepEqual(validateDeploymentEnvironment('api', staging), [])
  assert.match(
    validateDeploymentEnvironment('api', { ...staging, ALLOW_MOCK_BILLING: 'false' }).join(' '),
    /explicitly enabled/
  )
  assert.match(
    validateDeploymentEnvironment('api', { ...staging, APP_ENV: 'production' }).join(' '),
    /forbidden in production/
  )
})

test('allows the draft app to use direct shop OAuth before an App Store URL exists', () => {
  const env = validEnvironment('api')
  assert.equal(env.SHOPIFY_INSTALL_URL, undefined)
  assert.deepEqual(validateDeploymentEnvironment('api', env), [])
})

test('uses Vercel production as the safe API environment default', () => {
  const env = validEnvironment('api')
  delete env.APP_ENV
  env.VERCEL = '1'
  env.BILLING_PROVIDER = 'shopify_app_pricing'
  assert.deepEqual(validateDeploymentEnvironment('api', env), [])
})
