import assert from 'node:assert/strict'
import test from 'node:test'
import { getStorefrontAssetPath, logoUploadErrorMessage } from './storefrontAssets.js'

test('shows actionable onboarding logo validation messages', () => {
  assert.equal(
    logoUploadErrorMessage(new Error('invalid_asset_type')),
    'Yalnızca gerçek JPEG, PNG veya WEBP dosyaları yüklenebilir.'
  )
  assert.equal(
    logoUploadErrorMessage(new Error('invalid_asset_dimensions')),
    'Logo ölçüsü 64×32 ile 2400×1200 piksel arasında olmalı.'
  )
  assert.equal(
    logoUploadErrorMessage(new Error('storefront_asset_quota_exceeded')),
    'Bu mağazanın 25 MB görsel kotası doldu.'
  )
})

test('extracts only a managed storefront asset path', () => {
  assert.equal(
    getStorefrontAssetPath('https://project.supabase.co/storage/v1/object/public/storefront-assets/storefront-1/logos/logo.webp?v=1'),
    'storefront-1/logos/logo.webp'
  )
  assert.equal(getStorefrontAssetPath('https://images.example/logo.webp'), null)
})
