import assert from 'node:assert/strict'
import test from 'node:test'
import { buildStorefrontPreviewUrl } from './storefrontPreview.js'

test('keeps preview credentials in the fragment and never adds a host override', () => {
  const url = new URL(buildStorefrontPreviewUrl({
    baseUrl: 'https://preview.yourprostore.ai/',
    token: 'signed.preview-token'
  }))

  assert.equal(url.origin, 'https://preview.yourprostore.ai')
  assert.equal(url.searchParams.has('host'), false)
  assert.equal(url.searchParams.has('previewHost'), false)
  assert.equal(new URLSearchParams(url.hash.slice(1)).get('previewToken'), 'signed.preview-token')
})
