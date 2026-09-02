import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const PREVIEW_TTL_SECONDS = 5 * 60

function encode(value) {
  return Buffer.from(value).toString('base64url')
}

function signature(secret, payload) {
  return createHmac('sha256', secret).update(payload).digest()
}

export function createStorefrontPreviewService({ database, signingSecret, now = () => Date.now() }) {
  if (!database?.query) throw new Error('database.query is required.')
  if (!signingSecret || Buffer.byteLength(signingSecret) < 32) {
    throw new Error('Storefront preview signing secret must be at least 32 bytes.')
  }

  return {
    async issue({ userId, storefrontId }) {
      const access = await database.query(
        `select storefront.id::text as storefront_id, domain.hostname
         from public.storefronts storefront
         join public.shopify_stores store on store.id = storefront.shopify_store_id
         join public.workspace_memberships membership
           on membership.workspace_id = store.workspace_id and membership.user_id = $1
         join lateral (
           select hostname
           from public.store_domains
           where storefront_id = storefront.id and status = 'active'
           order by is_primary desc, case when kind = 'custom' then 0 else 1 end, created_at
           limit 1
         ) domain on true
         where storefront.id = $2`,
        [userId, storefrontId]
      )
      const row = access.rows[0]
      if (!row) throw new Error('storefront_access_denied')

      const issuedAt = Math.floor(now() / 1000)
      const claims = encode(JSON.stringify({
        v: 1,
        storefrontId: row.storefront_id,
        hostname: row.hostname,
        iat: issuedAt,
        exp: issuedAt + PREVIEW_TTL_SECONDS,
        nonce: randomBytes(16).toString('base64url')
      }))
      return {
        token: `${claims}.${signature(signingSecret, claims).toString('base64url')}`,
        hostname: row.hostname,
        expiresAt: new Date((issuedAt + PREVIEW_TTL_SECONDS) * 1000).toISOString()
      }
    },

    verify(token) {
      const [claims, receivedSignature, extra] = String(token || '').split('.')
      if (!claims || !receivedSignature || extra) throw new Error('invalid_storefront_preview_token')

      let received
      let payload
      try {
        received = Buffer.from(receivedSignature, 'base64url')
        payload = JSON.parse(Buffer.from(claims, 'base64url').toString('utf8'))
      } catch {
        throw new Error('invalid_storefront_preview_token')
      }
      const expected = signature(signingSecret, claims)
      if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
        throw new Error('invalid_storefront_preview_token')
      }
      const currentTime = Math.floor(now() / 1000)
      if (
        payload.v !== 1 ||
        typeof payload.storefrontId !== 'string' ||
        typeof payload.hostname !== 'string' ||
        !Number.isInteger(payload.iat) ||
        !Number.isInteger(payload.exp) ||
        payload.exp <= currentTime ||
        payload.iat > currentTime + 30 ||
        payload.exp - payload.iat !== PREVIEW_TTL_SECONDS
      ) {
        throw new Error('invalid_storefront_preview_token')
      }
      return payload
    }
  }
}
