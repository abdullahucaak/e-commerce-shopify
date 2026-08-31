import assert from 'node:assert/strict'
import test from 'node:test'
import { buildApp } from './app.mjs'

function multipartFile({ boundary, mimeType, filename, buffer }) {
  return Buffer.concat([
    Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
      `Content-Type: ${mimeType}\r\n\r\n`
    ),
    buffer,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ])
}

test('passes one authenticated multipart asset to the storefront asset service', async t => {
  let received = null
  const app = buildApp({
    database: { query: async () => ({ rows: [] }) },
    verifyAccessToken: async token => token === 'valid-token' ? { id: 'user-1' } : null,
    storefrontAssets: {
      async upload(input) {
        received = input
        return {
          asset: { path: 'storefront-1/hero/file.webp', publicUrl: 'https://example/file.webp' },
          quota: { usedBytes: 100, limitBytes: 1000 }
        }
      },
      async remove() { return { removed: true } }
    },
    logger: false
  })
  t.after(() => app.close())
  const boundary = 'yourprostore-boundary'
  const file = Buffer.from('real-image-bytes')

  const response = await app.inject({
    method: 'POST',
    url: '/api/storefronts/storefront-1/assets/hero',
    headers: {
      authorization: 'Bearer valid-token',
      'content-type': `multipart/form-data; boundary=${boundary}`
    },
    payload: multipartFile({
      boundary,
      mimeType: 'image/webp',
      filename: 'banner.webp',
      buffer: file
    })
  })

  assert.equal(response.statusCode, 201)
  assert.equal(received.userId, 'user-1')
  assert.equal(received.accessToken, 'valid-token')
  assert.equal(received.storefrontId, 'storefront-1')
  assert.equal(received.purpose, 'hero')
  assert.equal(received.claimedMimeType, 'image/webp')
  assert.deepEqual(received.buffer, file)
})

test('does not parse an anonymous multipart upload or delete request', async t => {
  let called = false
  const app = buildApp({
    database: { query: async () => ({ rows: [] }) },
    storefrontAssets: {
      async upload() { called = true },
      async remove() { called = true }
    },
    logger: false
  })
  t.after(() => app.close())

  const upload = await app.inject({
    method: 'POST',
    url: '/api/storefronts/storefront-1/assets/logo',
    headers: { 'content-type': 'multipart/form-data; boundary=empty' },
    payload: '--empty--\r\n'
  })
  const removal = await app.inject({
    method: 'DELETE',
    url: '/api/storefronts/storefront-1/assets',
    payload: { path: 'storefront-1/logos/file.webp' }
  })

  assert.equal(upload.statusCode, 401)
  assert.equal(removal.statusCode, 401)
  assert.equal(called, false)
})

