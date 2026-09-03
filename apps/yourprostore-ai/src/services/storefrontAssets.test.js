import assert from 'node:assert/strict'
import test from 'node:test'
import { getStorefrontAssetPath, logoUploadErrorMessage } from './storefrontAssets.js'

test('shows actionable onboarding logo validation messages', () => {
  assert.equal(
    logoUploadErrorMessage(new Error('invalid_asset_type')),
    'Only valid JPEG, PNG, or WEBP files can be uploaded.'
  )
  assert.equal(
    logoUploadErrorMessage(new Error('invalid_asset_dimensions')),
    'Logo dimensions must be between 64×32 and 2400×1200 pixels.'
  )
  assert.equal(
    logoUploadErrorMessage(new Error('storefront_asset_quota_exceeded')),
    'This store has reached its 25 MB image quota.'
  )
})

test('extracts only a managed storefront asset path', () => {
  assert.equal(
    getStorefrontAssetPath('https://project.supabase.co/storage/v1/object/public/storefront-assets/storefront-1/logos/logo.webp?v=1'),
    'storefront-1/logos/logo.webp'
  )
  assert.equal(getStorefrontAssetPath('https://images.example/logo.webp'), null)
})
