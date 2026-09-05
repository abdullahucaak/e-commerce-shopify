import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import test from 'node:test'
import {
  decryptAdminToken,
  encryptAdminToken,
  exchangeAuthorizationCode,
  normalizeShopDomain,
  refreshOfflineAccessToken,
  shopifyGraphqlErrorMessage,
  verifyShopifyHmac
} from './shopify-oauth.mjs'

test('requests an expiring offline token during authorization code exchange', async () => {
  let request
  const payload = await exchangeAuthorizationCode({
    shop: 'example.myshopify.com', code: 'code', clientId: 'client', clientSecret: 'secret',
    fetchImpl: async (url, options) => {
      request = { url, options }
      return { ok: true, json: async () => ({ access_token: 'access', refresh_token: 'refresh' }) }
    }
  })
  assert.equal(payload.access_token, 'access')
  assert.equal(request.options.body.get('expiring'), '1')
  assert.equal(request.options.body.get('code'), 'code')
})

test('refreshes an expiring offline token with the refresh token grant', async () => {
  let body
  const payload = await refreshOfflineAccessToken({
    shop: 'example.myshopify.com', refreshToken: 'old-refresh', clientId: 'client', clientSecret: 'secret',
    fetchImpl: async (_url, options) => {
      body = options.body
      return { ok: true, json: async () => ({ access_token: 'new-access', refresh_token: 'new-refresh' }) }
    }
  })
  assert.equal(payload.refresh_token, 'new-refresh')
  assert.equal(body.get('grant_type'), 'refresh_token')
  assert.equal(body.get('refresh_token'), 'old-refresh')
})

test('normalizes Shopify GraphQL array, object, and string errors', () => {
  assert.equal(shopifyGraphqlErrorMessage([{ message: 'First' }, { message: 'Second' }]), 'First; Second')
  assert.equal(shopifyGraphqlErrorMessage({ message: 'Object error' }), 'Object error')
  assert.equal(shopifyGraphqlErrorMessage('String error'), 'String error')
  assert.equal(shopifyGraphqlErrorMessage({ code: 'unknown' }), 'Shopify Admin API returned an error.')
})

test('normalizes a valid myshopify domain', () => {
  assert.equal(
    normalizeShopDomain('HTTPS://GlowField-2.MyShopify.com/'),
    'glowfield-2.myshopify.com'
  )
})

test('rejects custom domains and paths as OAuth shop domains', () => {
  assert.throws(() => normalizeShopDomain('glowfield.co'), /invalid_shop_domain/)
  assert.throws(
    () => normalizeShopDomain('glowfield-2.myshopify.com/admin'),
    /invalid_shop_domain/
  )
})

test('verifies Shopify callback HMAC without trusting parameter order', () => {
  const secret = 'test-secret'
  const message = 'code=temporary-code&shop=glowfield-2.myshopify.com&state=nonce&timestamp=123'
  const hmac = createHmac('sha256', secret).update(message).digest('hex')
  const params = new URLSearchParams({
    timestamp: '123',
    state: 'nonce',
    hmac,
    shop: 'glowfield-2.myshopify.com',
    code: 'temporary-code'
  })

  assert.equal(verifyShopifyHmac(params, secret), true)
  params.set('shop', 'attacker.myshopify.com')
  assert.equal(verifyShopifyHmac(params, secret), false)
})

test('encrypts an Admin API token with a random authenticated cipher', () => {
  const first = encryptAdminToken('shpat_sensitive', 'encryption-secret')
  const second = encryptAdminToken('shpat_sensitive', 'encryption-secret')

  assert.match(first, /^v1:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/)
  assert.equal(first.includes('shpat_sensitive'), false)
  assert.notEqual(first, second)
})

test('decrypts only with the matching application secret', () => {
  const encrypted = encryptAdminToken('shpat_test_token', 'encryption-secret')
  assert.equal(decryptAdminToken(encrypted, 'encryption-secret'), 'shpat_test_token')
  assert.throws(() => decryptAdminToken(encrypted, 'wrong-secret'))
})
