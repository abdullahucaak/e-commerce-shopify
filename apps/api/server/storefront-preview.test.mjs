import assert from 'node:assert/strict'
import test from 'node:test'
import { createStorefrontPreviewService } from './storefront-preview.mjs'

const secret = 'a-secure-preview-signing-key-with-32-bytes'
const storefrontId = '5d07f694-421d-4538-acf3-6c3337284628'

test('issues a five-minute preview token only for a storefront member', async () => {
  let parameters
  const service = createStorefrontPreviewService({
    database: {
      async query(_sql, values) {
        parameters = values
        return { rows: [{ storefront_id: storefrontId, hostname: 'glowfield.co' }] }
      }
    },
    signingSecret: secret,
    now: () => Date.parse('2026-09-02T10:00:00.000Z')
  })

  const result = await service.issue({ userId: 'user-1', storefrontId })
  const claims = service.verify(result.token)

  assert.deepEqual(parameters, ['user-1', storefrontId])
  assert.equal(result.hostname, 'glowfield.co')
  assert.equal(result.expiresAt, '2026-09-02T10:05:00.000Z')
  assert.equal(claims.storefrontId, storefrontId)
  assert.equal(claims.hostname, 'glowfield.co')
})

test('rejects expired and tampered preview tokens', async () => {
  let currentTime = Date.parse('2026-09-02T10:00:00.000Z')
  const service = createStorefrontPreviewService({
    database: { query: async () => ({ rows: [{ storefront_id: storefrontId, hostname: 'glowfield.co' }] }) },
    signingSecret: secret,
    now: () => currentTime
  })
  const { token } = await service.issue({ userId: 'user-1', storefrontId })

  assert.throws(() => service.verify(`${token}changed`), /invalid_storefront_preview_token/)
  currentTime += 301_000
  assert.throws(() => service.verify(token), /invalid_storefront_preview_token/)
})

test('denies preview issuance when storefront membership is missing', async () => {
  const service = createStorefrontPreviewService({
    database: { query: async () => ({ rows: [] }) },
    signingSecret: secret
  })
  await assert.rejects(
    service.issue({ userId: 'other-user', storefrontId }),
    /storefront_access_denied/
  )
})
