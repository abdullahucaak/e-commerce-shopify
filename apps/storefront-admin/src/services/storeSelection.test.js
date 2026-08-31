import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveSelectedStoreId } from './storeSelection.js'

const stores = [
  { id: 'shopify-a', storefront: { id: 'storefront-a' } },
  { id: 'shopify-b', storefront: { id: 'storefront-b' } }
]

test('selects the storefront requested by yourprostore-ai', () => {
  assert.equal(resolveSelectedStoreId(stores, { storefrontId: 'storefront-b' }), 'shopify-b')
})

test('keeps a valid current store while navigating inside the CMS', () => {
  assert.equal(resolveSelectedStoreId(stores, { currentStoreId: 'shopify-b' }), 'shopify-b')
})

test('does not accept an unknown storefront id', () => {
  assert.equal(resolveSelectedStoreId(stores, { storefrontId: 'another-tenant' }), 'shopify-a')
})
