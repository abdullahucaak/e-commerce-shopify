import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getStorefrontAssetPath,
  storefrontAssetErrorMessage
} from './storefrontAssets.js'

test('extracts only a storefront-assets storage path', () => {
  assert.equal(
    getStorefrontAssetPath('https://example.supabase.co/storage/v1/object/public/storefront-assets/store-a/hero/banner.webp?v=1'),
    'store-a/hero/banner.webp'
  )
  assert.equal(getStorefrontAssetPath('https://images.example/banner.webp'), null)
})

test('turns server-side asset validation errors into actionable messages', () => {
  const dimensionError = new Error('invalid_asset_dimensions')
  dimensionError.details = {
    minWidth: 1200,
    minHeight: 400,
    maxWidth: 4096,
    maxHeight: 4096
  }
  assert.equal(
    storefrontAssetErrorMessage(dimensionError, 'Banner'),
    'Banner ölçüsü 1200×400 ile 4096×4096 piksel arasında olmalı.'
  )
  assert.equal(
    storefrontAssetErrorMessage(new Error('storefront_asset_quota_exceeded')),
    'Bu mağazanın 25 MB görsel kotası doldu.'
  )
})
