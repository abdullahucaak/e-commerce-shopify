import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveBillingProvider } from './config/env.mjs'

test('uses mock billing only outside production', () => {
  assert.equal(resolveBillingProvider({
    nodeEnv: 'development', requestedProvider: 'mock', stripeConfigured: false
  }), 'mock')
  assert.throws(
    () => resolveBillingProvider({
      nodeEnv: 'production', requestedProvider: 'mock', stripeConfigured: false
    }),
    /forbidden in production/
  )
})

test('requires complete Stripe configuration when Stripe is selected', () => {
  assert.throws(
    () => resolveBillingProvider({
      nodeEnv: 'development', requestedProvider: 'stripe', stripeConfigured: false
    }),
    /requires all Stripe environment variables/
  )
  assert.equal(resolveBillingProvider({
    nodeEnv: 'production', requestedProvider: 'stripe', stripeConfigured: true
  }), 'stripe')
})

test('defaults to disabled without Stripe credentials', () => {
  assert.equal(resolveBillingProvider({
    nodeEnv: 'test', requestedProvider: '', stripeConfigured: false
  }), 'disabled')
})

test('prefers Shopify App Pricing when Partner API credentials are configured', () => {
  assert.equal(resolveBillingProvider({
    nodeEnv: 'production', requestedProvider: '', stripeConfigured: false,
    shopifyAppPricingConfigured: true
  }), 'shopify_app_pricing')
  assert.throws(
    () => resolveBillingProvider({
      nodeEnv: 'production', requestedProvider: 'shopify_app_pricing', stripeConfigured: false,
      shopifyAppPricingConfigured: false
    }),
    /requires all Partner API environment variables/
  )
})
