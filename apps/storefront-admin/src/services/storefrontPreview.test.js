import assert from 'node:assert/strict'
import test from 'node:test'
import { buildStorefrontPreviewUrl } from './storefrontPreview.js'

test('keeps preview credentials in the URL fragment', () => {
  const url = new URL(buildStorefrontPreviewUrl({
    baseUrl: 'https://storefront.example.com/',
    page: '/about-us',
    hostname: 'shop.example.com',
    token: 'signed.preview-token'
  }))

  assert.equal(url.pathname, '/about-us')
  assert.equal(url.searchParams.has('previewToken'), false)
  assert.equal(new URLSearchParams(url.hash.slice(1)).get('previewToken'), 'signed.preview-token')
})
