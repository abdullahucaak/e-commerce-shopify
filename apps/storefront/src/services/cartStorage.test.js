import assert from 'node:assert/strict'
import test from 'node:test'
import { getCartStorageKeyForRuntime } from './cartStorage.js'

test('scopes Shopify cart storage to the storefront id', () => {
  const first = getCartStorageKeyForRuntime({
    storefront: { id: 'storefront-a' },
    shopify: { domain: 'first.myshopify.com' }
  })
  const second = getCartStorageKeyForRuntime({
    storefront: { id: 'storefront-b' },
    shopify: { domain: 'second.myshopify.com' }
  })

  assert.equal(first, 'shopifyCartId:storefront-a')
  assert.equal(second, 'shopifyCartId:storefront-b')
  assert.notEqual(first, second)
})

test('uses the permanent Shopify identity if a storefront id is unavailable', () => {
  assert.equal(
    getCartStorageKeyForRuntime({ shopify: { domain: 'stable-shop.myshopify.com' } }),
    'shopifyCartId:stable-shop.myshopify.com'
  )
})
