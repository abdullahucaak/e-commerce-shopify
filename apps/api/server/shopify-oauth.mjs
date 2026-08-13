import {
  createDecipheriv,
  createCipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual
} from 'node:crypto'

export const SHOPIFY_STOREFRONT_SCOPES = Object.freeze([
  'unauthenticated_read_product_listings',
  'unauthenticated_read_product_inventory',
  'unauthenticated_read_product_tags',
  'unauthenticated_read_checkouts',
  'unauthenticated_write_checkouts'
])

const SHOP_DOMAIN_PATTERN = /^[a-z0-9][a-z0-9-]*[.]myshopify[.]com$/

export function normalizeShopDomain(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')

  if (!SHOP_DOMAIN_PATTERN.test(normalized)) {
    throw new Error('invalid_shop_domain')
  }

  return normalized
}

function normalizeOrigin(value, name) {
  const url = new URL(value)
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`${name} must use HTTP or HTTPS.`)
  }
  return url.origin
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function buildAuthorizationUrl({ shop, clientId, callbackUrl, nonce }) {
  const authorizationUrl = new URL(`https://${shop}/admin/oauth/authorize`)
  authorizationUrl.searchParams.set('client_id', clientId)
  authorizationUrl.searchParams.set('redirect_uri', callbackUrl)
  authorizationUrl.searchParams.set('state', nonce)
  return authorizationUrl.toString()
}

function safeEqualHex(first, second) {
  if (!/^[a-f0-9]+$/i.test(first) || !/^[a-f0-9]+$/i.test(second)) return false

  const firstBuffer = Buffer.from(first, 'hex')
  const secondBuffer = Buffer.from(second, 'hex')
  return firstBuffer.length === secondBuffer.length && timingSafeEqual(firstBuffer, secondBuffer)
}

export function verifyShopifyHmac(searchParams, clientSecret) {
  const providedHmac = searchParams.get('hmac') || ''
  const pairs = [...searchParams.entries()]
    .filter(([key]) => key !== 'hmac' && key !== 'signature')
    .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey))
  const message = pairs.map(([key, value]) => `${key}=${value}`).join('&')
  const expectedHmac = createHmac('sha256', clientSecret)
    .update(message)
    .digest('hex')

  return safeEqualHex(providedHmac, expectedHmac)
}

export function encryptAdminToken(accessToken, encryptionSecret) {
  const key = createHash('sha256').update(encryptionSecret).digest()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([
    cipher.update(accessToken, 'utf8'),
    cipher.final()
  ])
  const authTag = cipher.getAuthTag()

  return [
    'v1',
    iv.toString('base64url'),
    authTag.toString('base64url'),
    ciphertext.toString('base64url')
  ].join(':')
}

export function decryptAdminToken(encryptedToken, encryptionSecret) {
  const [version, ivValue, tagValue, ciphertextValue] = String(encryptedToken || '').split(':')
  if (version !== 'v1' || !ivValue || !tagValue || !ciphertextValue) {
    throw new Error('invalid_encrypted_token')
  }

  const key = createHash('sha256').update(encryptionSecret).digest()
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivValue, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, 'base64url')),
    decipher.final()
  ]).toString('utf8')
}

async function shopifyAdminGraphql({ shop, accessToken, apiVersion, query, variables }) {
  const response = await fetch(`https://${shop}/admin/api/${apiVersion}/graphql.json`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-shopify-access-token': accessToken
    },
    body: JSON.stringify({ query, variables })
  })
  const payload = await response.json()

  if (!response.ok || payload.errors?.length) {
    const message = payload.errors?.map(error => error.message).join('; ')
    throw new Error(message || `Shopify Admin API returned HTTP ${response.status}.`)
  }

  return payload.data
}

async function exchangeAuthorizationCode({ shop, code, clientId, clientSecret }) {
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code
    })
  })
  const payload = await response.json()

  if (!response.ok || !payload.access_token) {
    throw new Error('shopify_token_exchange_failed')
  }

  return payload
}

async function readShopInstallation({ shop, accessToken, apiVersion }) {
  const data = await shopifyAdminGraphql({
    shop,
    accessToken,
    apiVersion,
    query: `
      query PlatformShopIdentity {
        shop {
          id
          name
          myshopifyDomain
          currencyCode
          primaryDomain { host }
        }
        currentAppInstallation {
          accessScopes { handle }
        }
      }
    `
  })

  return {
    identity: data.shop,
    grantedScopes: data.currentAppInstallation.accessScopes.map(scope => scope.handle)
  }
}

async function createStorefrontAccessToken({ shop, accessToken, apiVersion }) {
  const data = await shopifyAdminGraphql({
    shop,
    accessToken,
    apiVersion,
    query: `
      mutation CreatePlatformStorefrontToken($input: StorefrontAccessTokenInput!) {
        storefrontAccessTokenCreate(input: $input) {
          storefrontAccessToken {
            accessToken
            accessScopes { handle }
          }
          userErrors { field message }
        }
      }
    `,
    variables: {
      input: { title: 'GlowField Commerce storefront' }
    }
  })
  const result = data.storefrontAccessTokenCreate

  if (result.userErrors?.length || !result.storefrontAccessToken?.accessToken) {
    throw new Error(
      result.userErrors?.map(error => error.message).join('; ') ||
      'storefront_token_creation_failed'
    )
  }

  return {
    accessToken: result.storefrontAccessToken.accessToken,
    accessScopes: result.storefrontAccessToken.accessScopes.map(scope => scope.handle)
  }
}

async function persistShopInstallation({
  database,
  userId,
  workspaceId,
  requestedShop,
  identity,
  grantedScopes,
  adminAccessToken,
  storefrontAccessToken,
  encryptionSecret
}) {
  const client = await database.connect()

  try {
    await client.query('begin')
    const canonicalShop = normalizeShopDomain(identity.myshopifyDomain)
    const existing = await client.query(
      `select id, workspace_id
       from public.shopify_stores
       where shopify_gid = $1
          or lower(installed_myshopify_domain) = $2
          or lower(current_myshopify_domain) = $2
       limit 1
       for update`,
      [identity.id, canonicalShop]
    )

    if (existing.rows[0] && existing.rows[0].workspace_id !== workspaceId) {
      throw new Error('shop_already_connected')
    }

    const storeResult = await client.query(
      `insert into public.shopify_stores (
         workspace_id,
         shopify_gid,
         installed_myshopify_domain,
         current_myshopify_domain,
         shopify_primary_domain,
         shop_name,
         status,
         granted_scopes,
         currency_code,
         last_shop_sync_at
       ) values ($1, $2, $3, $4, $5, $6, 'active', $7, $8, now())
       on conflict (shopify_gid) do update set
         current_myshopify_domain = excluded.current_myshopify_domain,
         shopify_primary_domain = excluded.shopify_primary_domain,
         shop_name = excluded.shop_name,
         status = 'active',
         granted_scopes = excluded.granted_scopes,
         currency_code = excluded.currency_code,
         uninstalled_at = null,
         last_shop_sync_at = now()
       returning id`,
      [
        workspaceId,
        identity.id,
        requestedShop,
        canonicalShop,
        identity.primaryDomain?.host?.toLowerCase() || null,
        identity.name,
        grantedScopes,
        identity.currencyCode || null
      ]
    )
    const shopifyStoreId = storeResult.rows[0].id

    await client.query(
      'update public.shopify_domain_aliases set is_current = false where shopify_store_id = $1',
      [shopifyStoreId]
    )

    for (const alias of new Set([requestedShop, canonicalShop])) {
      await client.query(
        `insert into public.shopify_domain_aliases (
           shopify_store_id, myshopify_domain, is_current
         ) values ($1, $2, $3)
         on conflict (lower(myshopify_domain)) do update set
           shopify_store_id = excluded.shopify_store_id,
           is_current = excluded.is_current,
           last_seen_at = now()`,
        [shopifyStoreId, alias, alias === canonicalShop]
      )
    }

    await client.query(
      `insert into private.shopify_credentials (
         shopify_store_id,
         admin_access_token_ciphertext,
         storefront_public_access_token
       ) values ($1, $2, $3)
       on conflict (shopify_store_id) do update set
         admin_access_token_ciphertext = excluded.admin_access_token_ciphertext,
         storefront_public_access_token = excluded.storefront_public_access_token,
         updated_at = now()`,
      [
        shopifyStoreId,
        encryptAdminToken(adminAccessToken, encryptionSecret),
        storefrontAccessToken
      ]
    )

    const storefrontResult = await client.query(
      `insert into public.storefronts (shopify_store_id, status, release_channel)
       values ($1, 'onboarding', 'stable')
       on conflict (shopify_store_id) do update set updated_at = now()
       returning id`,
      [shopifyStoreId]
    )
    const storefrontId = storefrontResult.rows[0].id

    await client.query(
      `insert into public.store_subscriptions (
         storefront_id, plan_key, status, unit_amount, currency_code
       ) values ($1, 'starter_monthly', 'incomplete', 900, 'USD')
       on conflict (storefront_id) do nothing`,
      [storefrontId]
    )

    await client.query(
      `insert into public.onboarding_progress (storefront_id, step_key, status)
       select $1, step.step_key, 'not_started'::public.onboarding_step_status
       from (values
         ('shopify_connection'),
         ('plan_selection'),
         ('niche_selection'),
         ('banner_selection'),
         ('brand_setup'),
         ('product_readiness'),
         ('store_preview'),
         ('domain_setup'),
         ('publish')
       ) as step(step_key)
       on conflict (storefront_id, step_key) do nothing`,
      [storefrontId]
    )

    await client.query(
      `update public.onboarding_progress
       set status = 'completed', completed_at = coalesce(completed_at, now())
       where storefront_id = $1 and step_key = 'shopify_connection'`,
      [storefrontId]
    )

    await client.query(
      `insert into public.storefront_config_versions (
         storefront_id, version, status, settings, created_by, published_at
       ) values ($1, 1, 'published', $2, $3, now())
       on conflict (storefront_id, version) do nothing`,
      [
        storefrontId,
        {
          brand: {
            name: identity.name,
            colors: { primary: '#303841', secondary: '#007dcc' }
          }
        },
        userId
      ]
    )

    await client.query(
      `insert into private.audit_logs (
         workspace_id, actor_user_id, action, target_type, target_id, metadata
       ) values ($1, $2, 'shopify.connected', 'shopify_store', $3, $4)`,
      [workspaceId, userId, shopifyStoreId, { myshopifyDomain: canonicalShop }]
    )

    await client.query('commit')
    return { shopifyStoreId, storefrontId }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

export function createShopifyOAuthService({
  database,
  clientId,
  clientSecret,
  previousClientSecret = null,
  appUrl,
  installUrl = null,
  platformUrl,
  apiVersion = '2026-07',
  tokenEncryptionSecret = clientSecret
}) {
  const normalizedAppUrl = normalizeOrigin(appUrl, 'SHOPIFY_APP_URL')
  const normalizedPlatformUrl = normalizeOrigin(platformUrl, 'PLATFORM_APP_URL')
  const callbackUrl = `${normalizedAppUrl}/api/shopify/callback`

  return {
    async beginStoreSelection({ user, workspaceId }) {
      if (!installUrl) throw new Error('shopify_install_url_missing')

      const membership = await database.query(
        `select role::text
         from public.workspace_memberships
         where workspace_id = $1 and user_id = $2`,
        [workspaceId, user.id]
      )
      if (!membership.rows[0] || !['owner', 'admin'].includes(membership.rows[0].role)) {
        throw new Error('workspace_access_denied')
      }

      const nonce = randomBytes(32).toString('base64url')
      await database.query(
        `insert into private.shopify_oauth_states (
           nonce_hash, user_id, workspace_id, shop_domain, expires_at
         ) values ($1, $2, $3, null, now() + interval '10 minutes')`,
        [sha256(nonce), user.id, workspaceId]
      )

      return { redirectUrl: installUrl, nonce }
    },

    async begin({ user, workspaceId, shop }) {
      const normalizedShop = normalizeShopDomain(shop)
      const membership = await database.query(
        `select role::text
         from public.workspace_memberships
         where workspace_id = $1 and user_id = $2`,
        [workspaceId, user.id]
      )

      if (!membership.rows[0] || !['owner', 'admin'].includes(membership.rows[0].role)) {
        throw new Error('workspace_access_denied')
      }

      const nonce = randomBytes(32).toString('base64url')
      await database.query(
        `insert into private.shopify_oauth_states (
           nonce_hash, user_id, workspace_id, shop_domain, expires_at
         ) values ($1, $2, $3, $4, now() + interval '10 minutes')`,
        [sha256(nonce), user.id, workspaceId, normalizedShop]
      )

      return buildAuthorizationUrl({
        shop: normalizedShop,
        clientId,
        callbackUrl,
        nonce
      })
    },

    async continueStoreSelection({ shop, nonce }) {
      const normalizedShop = normalizeShopDomain(shop)
      if (!nonce) throw new Error('missing_shopify_install_intent')

      const stateResult = await database.query(
        `update private.shopify_oauth_states
         set shop_domain = $2
         where nonce_hash = $1
           and shop_domain is null
           and consumed_at is null
           and expires_at > now()
         returning id`,
        [sha256(nonce), normalizedShop]
      )
      if (!stateResult.rows[0]) throw new Error('invalid_or_expired_install_intent')

      return buildAuthorizationUrl({
        shop: normalizedShop,
        clientId,
        callbackUrl,
        nonce
      })
    },

    async complete(requestUrl) {
      const url = new URL(requestUrl, normalizedAppUrl)
      const searchParams = url.searchParams

      const validCallbackSignature = [clientSecret, previousClientSecret]
        .filter(Boolean)
        .some(secret => verifyShopifyHmac(searchParams, secret))
      if (!validCallbackSignature) {
        throw new Error('invalid_shopify_hmac')
      }

      const timestamp = Number(searchParams.get('timestamp'))
      if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 600) {
        throw new Error('expired_shopify_callback')
      }

      const shop = normalizeShopDomain(searchParams.get('shop'))
      const state = searchParams.get('state') || ''
      const code = searchParams.get('code') || ''
      if (!state || !code) throw new Error('invalid_shopify_callback')

      const stateResult = await database.query(
        `update private.shopify_oauth_states
         set consumed_at = now()
         where nonce_hash = $1
           and consumed_at is null
           and expires_at > now()
         returning user_id, workspace_id, shop_domain`,
        [sha256(state)]
      )
      const oauthState = stateResult.rows[0]
      if (!oauthState) throw new Error('invalid_or_expired_oauth_state')

      const tokenPayload = await exchangeAuthorizationCode({
        shop,
        code,
        clientId,
        clientSecret
      })
      const installation = await readShopInstallation({
        shop,
        accessToken: tokenPayload.access_token,
        apiVersion
      })
      const { identity, grantedScopes } = installation
      const missingScopes = SHOPIFY_STOREFRONT_SCOPES.filter(
        scope => !grantedScopes.includes(scope)
      )
      if (missingScopes.length) throw new Error('required_shopify_scopes_missing')

      const storefrontToken = await createStorefrontAccessToken({
        shop,
        accessToken: tokenPayload.access_token,
        apiVersion
      })

      await persistShopInstallation({
        database,
        userId: oauthState.user_id,
        workspaceId: oauthState.workspace_id,
        // Shopify can return the current myshopify.com hostname even when the
        // authorization started from a historical hostname of the same shop.
        // Keep both; the Admin API identity below is the canonical shop proof.
        requestedShop: oauthState.shop_domain,
        identity,
        grantedScopes,
        adminAccessToken: tokenPayload.access_token,
        storefrontAccessToken: storefrontToken.accessToken,
        encryptionSecret: tokenEncryptionSecret
      })

      return `${normalizedPlatformUrl}/stores?shopify=connected`
    },

    installRedirect(shop) {
      const url = new URL('/stores', normalizedPlatformUrl)
      if (shop) url.searchParams.set('shop', shop)
      return url.toString()
    }
  }
}
