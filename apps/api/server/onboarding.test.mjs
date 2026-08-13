import assert from 'node:assert/strict'
import test from 'node:test'

import { completeOnboarding, selectBannerPreset } from './onboarding.mjs'

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
  const database = {
    async query(sql) {
      if (sql.includes('from public.storefronts storefront')) {
        return { rows: [{ id: 'storefront-1' }] }
      }
      if (sql.includes('from public.onboarding_progress')) {
        return { rows: [{ step_key: 'shopify_connection' }, { step_key: 'niche_selection' }] }
      }
      throw new Error(`Unexpected query: ${sql}`)
    }
  }

  await assert.rejects(
    completeOnboarding({ database, userId: 'user-1', storefrontId: 'storefront-1' }),
    error => {
      assert.equal(error.message, 'onboarding_incomplete')
      assert.ok(error.missingSteps.includes('domain_setup'))
      return true
    }
  )
})

test('completeOnboarding activates the storefront and records publish completion', async () => {
  const clientCalls = []
  const client = {
    async query(sql) {
      clientCalls.push(sql)
      return { rows: [] }
    },
    release() { clientCalls.push('release') }
  }
  const database = {
    async query(sql) {
      if (sql.includes('from public.storefronts storefront')) {
        return { rows: [{ id: 'storefront-1' }] }
      }
      if (sql.includes('from public.onboarding_progress')) {
        return {
          rows: [
            'shopify_connection',
            'niche_selection',
            'banner_selection',
            'brand_setup',
            'store_preview',
            'domain_setup'
          ].map(step_key => ({ step_key }))
        }
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
