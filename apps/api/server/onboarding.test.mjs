import assert from 'node:assert/strict'
import test from 'node:test'

import {
  completeOnboarding,
  selectBannerPreset,
  selectStorePlan,
  skipDomainSetup
} from './onboarding.mjs'

test('selectBannerPreset publishes the selected banner without losing other settings', async () => {
  const clientCalls = []
  let insertedSettings
  const client = {
    async query(sql, params = []) {
      clientCalls.push(sql)
      if (sql.includes('select settings from public.storefront_config_versions')) {
        return {
          rows: [{
            settings: {
              brand: { primaryColor: '#112233' },
              content: {
                home: { statement: 'Existing statement' },
                footer: { emails: ['hello@example.com'] }
              }
            }
          }]
        }
      }
      if (sql.includes('select coalesce(max(version)')) return { rows: [{ next_version: '4' }] }
      if (sql.includes('insert into public.storefront_config_versions')) insertedSettings = params[2]
      return { rows: [] }
    },
    release() {}
  }
  const database = {
    async query(sql) {
      if (sql.includes('from public.storefronts storefront')) {
        return { rows: [{ id: 'storefront-1', shop_name: 'Test', current_myshopify_domain: 'test.myshopify.com' }] }
      }
      if (sql.includes('from public.banner_presets preset')) {
        return {
          rows: [{
            id: 'preset-1',
            title: 'A fresh home',
            subtitle: 'Useful products for everyday living.',
            image_url: 'https://example.com/banner.jpg'
          }]
        }
      }
      throw new Error(`Unexpected query: ${sql}`)
    },
    async connect() { return client }
  }

  const result = await selectBannerPreset({
    database,
    userId: 'user-1',
    storefrontId: 'storefront-1',
    bannerPresetId: 'preset-1'
  })

  assert.equal(result.bannerPresetId, 'preset-1')
  assert.deepEqual(result.banner, {
    title: 'A fresh home',
    subtitle: 'Useful products for everyday living.',
    imageUrl: 'https://example.com/banner.jpg'
  })
  assert.deepEqual(insertedSettings.brand, { primaryColor: '#112233' })
  assert.deepEqual(insertedSettings.content.footer, { emails: ['hello@example.com'] })
  assert.deepEqual(insertedSettings.content.home, {
    statement: 'Existing statement',
    heroTitle: 'A fresh home',
    heroSubtitle: 'Useful products for everyday living.',
    heroImageUrl: 'https://example.com/banner.jpg'
  })
  assert.ok(clientCalls.some(sql => sql === 'commit'))
})

test('completeOnboarding rejects a storefront with missing setup steps', async () => {
  const client = {
    async query(sql) {
      if (sql.includes('from public.onboarding_progress')) {
        return { rows: [{ step_key: 'shopify_connection' }, { step_key: 'niche_selection' }] }
      }
      return { rows: [] }
    },
    release() {}
  }
  const database = {
    async query(sql) {
      if (sql.includes('from public.storefronts storefront')) {
        return { rows: [{ id: 'storefront-1', workspace_role: 'owner' }] }
      }
      throw new Error(`Unexpected query: ${sql}`)
    },
    async connect() { return client }
  }

  await assert.rejects(
    completeOnboarding({ database, userId: 'user-1', storefrontId: 'storefront-1' }),
    error => {
      assert.equal(error.message, 'onboarding_incomplete')
      assert.ok(error.missingSteps.includes('domain_setup'))
      assert.ok(error.missingSteps.includes('product_readiness'))
      assert.ok(error.missingSteps.includes('plan_selection'))
      return true
    }
  )
})

test('completeOnboarding activates the storefront and records publish completion', async () => {
  const clientCalls = []
  const client = {
    async query(sql) {
      clientCalls.push(sql)
      if (sql.includes('from public.onboarding_progress')) {
        return {
          rows: [
            'shopify_connection',
            'niche_selection',
            'banner_selection',
            'brand_setup',
            'product_readiness',
            'store_preview',
            'domain_setup',
            'plan_selection'
          ].map(step_key => ({ step_key }))
        }
      }
      if (sql.includes('from public.store_subscriptions')) {
        return { rows: [{ id: 'subscription-1' }] }
      }
      return { rows: [] }
    },
    release() { clientCalls.push('release') }
  }
  const database = {
    async query(sql) {
      if (sql.includes('from public.storefronts storefront')) {
        return { rows: [{ id: 'storefront-1', workspace_role: 'owner' }] }
      }
      throw new Error(`Unexpected query: ${sql}`)
    },
    async connect() { return client }
  }

  const result = await completeOnboarding({
    database,
    userId: 'user-1',
    storefrontId: 'storefront-1'
  })

  assert.deepEqual(result, { completed: true, status: 'active' })
  assert.ok(clientCalls.some(sql => sql.includes("update public.storefronts")))
  assert.ok(clientCalls.some(sql => sql.includes('insert into public.onboarding_progress')))
  assert.ok(clientCalls.includes('commit'))
  assert.ok(clientCalls.includes('release'))
})

test('completeOnboarding rejects publishing without an active store subscription', async () => {
  const client = {
    async query(sql) {
      if (sql.includes('from public.onboarding_progress')) {
        return {
          rows: [
            'shopify_connection', 'niche_selection', 'banner_selection', 'brand_setup',
            'product_readiness', 'store_preview', 'domain_setup', 'plan_selection'
          ].map(step_key => ({ step_key }))
        }
      }
      return { rows: [] }
    },
    release() {}
  }
  const database = {
    async query(sql) {
      if (sql.includes('from public.storefronts storefront')) {
        return { rows: [{ id: 'storefront-1' }] }
      }
      throw new Error(`Unexpected query: ${sql}`)
    },
    async connect() { return client }
  }

  await assert.rejects(
    completeOnboarding({ database, userId: 'user-1', storefrontId: 'storefront-1' }),
    { message: 'store_subscription_inactive' }
  )
})

test('selectStorePlan stores one subscription per storefront and completes plan selection', async () => {
  const calls = []
  const client = {
    async query(sql) {
      calls.push(sql)
      if (sql.includes('insert into public.store_subscriptions')) {
        return {
          rows: [{
            plan_key: 'starter_monthly',
            status: 'incomplete',
            unit_amount: 900,
            currency_code: 'USD'
          }]
        }
      }
      return { rows: [] }
    },
    release() { calls.push('release') }
  }
  const database = {
    async query(sql) {
      if (sql.includes('from public.storefronts storefront')) {
        return { rows: [{ id: 'storefront-1', workspace_role: 'owner' }] }
      }
      throw new Error(`Unexpected query: ${sql}`)
    },
    async connect() { return client }
  }

  const result = await selectStorePlan({
    database,
    userId: 'user-1',
    storefrontId: 'storefront-1',
    planKey: 'starter_monthly'
  })

  assert.equal(result.subscription.plan_key, 'starter_monthly')
  assert.equal(result.plan.unitAmount, 900)
  assert.ok(calls.some(sql => sql.includes("'plan_selection'")))
  assert.ok(calls.includes('commit'))
  assert.ok(calls.includes('release'))
})

test('skipDomainSetup completes the optional domain step without a domain', async () => {
  let update = null
  const database = {
    async query(sql, parameters = []) {
      if (sql.includes('from public.storefronts storefront')) {
        return { rows: [{ id: 'storefront-1', workspace_role: 'owner' }] }
      }
      if (sql.includes("'domain_setup'")) {
        update = { sql, parameters }
        return { rows: [] }
      }
      throw new Error(`Unexpected query: ${sql}`)
    }
  }

  const result = await skipDomainSetup({
    database, userId: 'user-1', storefrontId: 'storefront-1'
  })

  assert.deepEqual(result, { completed: true, skipped: true })
  assert.deepEqual(update.parameters, ['storefront-1'])
  assert.ok(update.sql.includes("jsonb_build_object('skipped', true)"))
})
