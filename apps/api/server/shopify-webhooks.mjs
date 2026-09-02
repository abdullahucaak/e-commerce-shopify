import { createHmac, timingSafeEqual } from 'node:crypto'

const SHOP_DOMAIN = /^[a-z0-9][a-z0-9-]*[.]myshopify[.]com$/
const PRIVACY_TOPICS = new Set(['customers/data_request', 'customers/redact', 'shop/redact'])
const SUPPORTED_TOPICS = new Set([
  'app/uninstalled',
  'shop/update',
  'domains/create',
  'domains/update',
  'domains/destroy',
  ...PRIVACY_TOPICS
])
const CLOSED_SHOP_PLANS = new Set(['cancelled', 'fraudulent', 'frozen'])
const MAX_ATTEMPTS = 8

function normalizedHeader(headers, name) {
  const value = headers?.[name] ?? headers?.[name.toLowerCase()]
  return Array.isArray(value) ? value[0] : String(value || '').trim()
}

export function verifyShopifyWebhookHmac(rawBody, providedHmac, secrets) {
  if (!Buffer.isBuffer(rawBody) || !providedHmac) return false
  const provided = Buffer.from(providedHmac, 'base64')
  if (!provided.length) return false

  return secrets.filter(Boolean).some(secret => {
    const expected = createHmac('sha256', secret).update(rawBody).digest()
    return expected.length === provided.length && timingSafeEqual(expected, provided)
  })
}

async function findStore(database, shop) {
  const result = await database.query(
    `select distinct store.id::text
     from public.shopify_stores store
     left join public.shopify_domain_aliases alias on alias.shopify_store_id = store.id
     where lower(store.installed_myshopify_domain) = $1
        or lower(store.current_myshopify_domain) = $1
        or lower(alias.myshopify_domain) = $1
     limit 1`,
    [shop]
  )
  return result.rows[0]?.id || null
}

async function claimEvent(database, { shopifyStoreId, webhookId, topic, apiVersion, payload }) {
  const result = await database.query(
    `insert into private.webhook_events (
       shopify_store_id, shopify_webhook_id, topic, api_version, status, payload,
       attempt_count, processing_started_at, last_attempt_at
     ) values ($1, $2, $3, $4, 'processing', $5, 1, now(), now())
     on conflict (shopify_webhook_id) do update set
       shopify_store_id = coalesce(private.webhook_events.shopify_store_id, excluded.shopify_store_id),
       status = 'processing',
       attempt_count = private.webhook_events.attempt_count + 1,
       processing_started_at = now(),
       last_attempt_at = now(),
       next_attempt_at = null,
       error_message = null
     where private.webhook_events.status = 'failed'
       and private.webhook_events.attempt_count < $6
     returning id::text, attempt_count`,
    [shopifyStoreId, webhookId, topic, apiVersion, payload, MAX_ATTEMPTS]
  )
  if (result.rows[0]) return result.rows[0]

  const existing = await database.query(
    `select status, attempt_count
     from private.webhook_events
     where shopify_webhook_id = $1`,
    [webhookId]
  )
  return { existing: existing.rows[0] || null }
}

async function finishEvent(database, eventId) {
  await database.query(
    `update private.webhook_events
     set status = 'processed', processed_at = now(), processing_started_at = null,
         next_attempt_at = null, error_message = null
     where id = $1`,
    [eventId]
  )
}

async function failEvent(database, event, error) {
  const exhausted = Number(event.attempt_count) >= MAX_ATTEMPTS
  await database.query(
    `update private.webhook_events
     set status = $2, processed_at = null, processing_started_at = null,
         next_attempt_at = case when $2 = 'failed' then now() else null end,
         error_message = $3
     where id = $1`,
    [event.id, exhausted ? 'dead_letter' : 'failed', String(error.message || error).slice(0, 1000)]
  )
}

async function withTransaction(database, operation) {
  if (!database.connect) return operation(database)
  const client = await database.connect()
  try {
    await client.query('begin')
    const result = await operation(client)
    await client.query('commit')
    return result
  } catch (error) {
    await client.query('rollback').catch(() => {})
    throw error
  } finally {
    client.release()
  }
}

export function createShopifyWebhookService({
  database,
  clientSecret,
  previousClientSecret = null,
  domainService = null,
  shopDataRedactor = null
}) {
  if (!database?.query) throw new Error('database.query is required.')
  if (!clientSecret) throw new Error('clientSecret is required.')

  return {
    async handle({ rawBody, headers }) {
      const hmac = normalizedHeader(headers, 'x-shopify-hmac-sha256')
      if (!verifyShopifyWebhookHmac(rawBody, hmac, [clientSecret, previousClientSecret])) {
        throw new Error('invalid_shopify_webhook_hmac')
      }

      const topic = normalizedHeader(headers, 'x-shopify-topic').toLowerCase()
      const webhookId = normalizedHeader(headers, 'x-shopify-webhook-id')
      const apiVersion = normalizedHeader(headers, 'x-shopify-api-version') || null
      const shop = normalizedHeader(headers, 'x-shopify-shop-domain').toLowerCase()
      if (!SUPPORTED_TOPICS.has(topic) || !webhookId || !SHOP_DOMAIN.test(shop)) {
        throw new Error('invalid_shopify_webhook_headers')
      }

      let payload
      try {
        payload = JSON.parse(rawBody.toString('utf8'))
      } catch {
        throw new Error('invalid_shopify_webhook_payload')
      }

      const shopifyStoreId = await findStore(database, shop)
      if (!shopifyStoreId && !PRIVACY_TOPICS.has(topic)) {
        return { accepted: true, ignored: true }
      }

      // Privacy request payloads can contain customer identifiers. This platform does
      // not retain Shopify customers/orders, so the operational ledger stores no copy.
      const event = await claimEvent(database, {
        shopifyStoreId,
        webhookId,
        topic,
        apiVersion,
        payload: PRIVACY_TOPICS.has(topic) ? null : payload
      })
      if (event.existing) {
        if (event.existing.status === 'processing') throw new Error('shopify_webhook_in_progress')
        return event.existing.status === 'dead_letter'
          ? { accepted: true, duplicate: true, deadLetter: true }
          : { accepted: true, duplicate: true }
      }

      try {
        if (topic === 'app/uninstalled') {
          await withTransaction(database, async client => {
            await client.query(
              `update public.shopify_stores
               set status = 'uninstalled', uninstalled_at = now(), updated_at = now()
               where id = $1`,
              [shopifyStoreId]
            )
            await client.query(
              `update public.storefronts
               set status = 'suspended', updated_at = now()
               where shopify_store_id = $1`,
              [shopifyStoreId]
            )
            await client.query(
              'delete from private.shopify_credentials where shopify_store_id = $1',
              [shopifyStoreId]
            )
          })
        } else if (topic === 'shop/update') {
          const currentShop = String(payload.myshopify_domain || shop).toLowerCase()
          if (!SHOP_DOMAIN.test(currentShop)) throw new Error('invalid_shop_domain')
          const primaryDomain = String(payload.domain || '').toLowerCase() || null
          const currencyCode = /^[A-Z]{3}$/.test(payload.currency) ? payload.currency : null
          const countryCode = /^[A-Z]{2}$/.test(payload.country_code) ? payload.country_code : null
          const shopClosed = CLOSED_SHOP_PLANS.has(String(payload.plan_name || '').toLowerCase())

          await withTransaction(database, async client => {
            await client.query(
              `update public.shopify_stores set
                 current_myshopify_domain = $2,
                 shopify_primary_domain = coalesce($3, shopify_primary_domain),
                 shop_name = coalesce(nullif($4, ''), shop_name),
                 currency_code = coalesce($5, currency_code),
                 primary_locale = coalesce(nullif($6, ''), primary_locale),
                 default_country_code = coalesce($7, default_country_code),
                 status = $8::public.shopify_store_status, uninstalled_at = null,
                 last_shop_sync_at = now(), updated_at = now()
               where id = $1`,
              [shopifyStoreId, currentShop, primaryDomain, String(payload.name || ''),
                currencyCode, String(payload.primary_locale || ''), countryCode,
                shopClosed ? 'error' : 'active']
            )
            await client.query(
              `update public.storefronts
               set status = $2::public.storefront_status, updated_at = now()
               where shopify_store_id = $1`,
              [shopifyStoreId, shopClosed ? 'suspended' : 'active']
            )
            await client.query(
              `update public.shopify_domain_aliases
               set is_current = false, last_seen_at = now()
               where shopify_store_id = $1 and lower(myshopify_domain) <> $2`,
              [shopifyStoreId, currentShop]
            )
            await client.query(
              `insert into public.shopify_domain_aliases (shopify_store_id, myshopify_domain, is_current)
               values ($1, $2, true)
               on conflict (lower(myshopify_domain)) do update set
                 shopify_store_id = excluded.shopify_store_id,
                 is_current = true, last_seen_at = now()`,
              [shopifyStoreId, currentShop]
            )
          })
        } else if (topic === 'shop/redact' && shopifyStoreId) {
          if (!shopDataRedactor) throw new Error('shop_data_redaction_unavailable')
          await shopDataRedactor.redact({ shopifyStoreId })
        } else if (topic.startsWith('domains/') && domainService?.syncStore) {
          await domainService.syncStore({ shopifyStoreId })
        }

        await finishEvent(database, event.id)
        return { accepted: true, topic }
      } catch (error) {
        await failEvent(database, event, error)
        throw error
      }
    }
  }
}
