import assert from 'node:assert/strict'
import test from 'node:test'
import { getStorefrontAssetPath } from './storefrontAssets.js'

test('extracts only a storefront-assets storage path', () => {
  assert.equal(
    getStorefrontAssetPath('https://example.supabase.co/storage/v1/object/public/storefront-assets/store-a/hero/banner.webp?v=1'),
    'store-a/hero/banner.webp'
  )
  assert.equal(getStorefrontAssetPath('https://images.example/banner.webp'), null)
})
