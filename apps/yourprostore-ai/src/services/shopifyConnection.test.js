import assert from 'node:assert/strict'
import test from 'node:test'
import {
  normalizeShopDomain,
  selectedShopFromSearch,
  shopifyConnectPayload
} from './shopifyConnection.js'

test('reads a verified Shopify store selection from the return URL', () => {
  assert.equal(
    selectedShopFromSearch('?shop=Kai-Wins-Tenant-Dev.MyShopify.com'),
    'kai-wins-tenant-dev.myshopify.com'
  )
})

test('rejects malformed Shopify store selections', () => {
  assert.equal(selectedShopFromSearch('?shop=example.com'), null)
  assert.equal(selectedShopFromSearch('?shop=evil.myshopify.com.example.org'), null)
  assert.equal(selectedShopFromSearch(''), null)
})

test('adds the selected shop only for the direct OAuth continuation', () => {
  assert.deepEqual(shopifyConnectPayload('workspace-1'), { workspaceId: 'workspace-1' })
  assert.deepEqual(shopifyConnectPayload('workspace-1', 'test.myshopify.com'), {
    workspaceId: 'workspace-1',
    shop: 'test.myshopify.com'
  })
})

test('normalizes a Shopify store handle or myshopify domain', () => {
  assert.equal(normalizeShopDomain(' My-Test-Store '), 'my-test-store.myshopify.com')
  assert.equal(normalizeShopDomain('MY-TEST-STORE.MYSHOPIFY.COM'), 'my-test-store.myshopify.com')
  assert.equal(normalizeShopDomain('example.com'), null)
  assert.equal(normalizeShopDomain(''), null)
})
