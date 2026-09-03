const SHOP_DOMAIN_PATTERN = /^[a-z0-9][a-z0-9-]*[.]myshopify[.]com$/
const ACTIVE_SUBSCRIPTION_QUERY = `
  query ActiveSubscription($appId: ID!, $shopId: ID!) {
    activeSubscription(appId: $appId, shopId: $shopId) {
      billingPeriod
      cancelAtEndOfCycle
      trialEndsAt
      currentBillingCycle { startTime endTime }
      items {
        handle
        price {
          __typename
          active
          currency
          ... on FlatRatePrice { amount }
        }
      }
    }
  }
`

function normalizeShop(value) {
  const shop = String(value || '').trim().toLowerCase()
  if (!SHOP_DOMAIN_PATTERN.test(shop)) throw new Error('invalid_shop_domain')
  return shop
}

function internalPlanKey(handle) {
  return String(handle || '').trim().toLowerCase().replaceAll('-', '_')
}

function moneyToMinorUnits(amount) {
  const numeric = Number(amount)
  if (!Number.isFinite(numeric) || numeric < 0) return null
  return Math.round(numeric * 100)
}

export function createShopifyAppPricingService({
  database,
  organizationId,
  appId,
  appHandle,
  accessToken,
  yourProStoreUrl,
  apiVersion = '2026-07',
  fetchImpl = fetch
}) {
  if (!database?.query) throw new Error('database.query is required.')
  if (!organizationId || !appId || !appHandle || !accessToken) {
    throw new Error('Shopify App Pricing credentials are required.')
  }

  const platformUrl = new URL(yourProStoreUrl)

  function planSelectionUrl(shop) {
    const storeHandle = normalizeShop(shop).replace(/[.]myshopify[.]com$/, '')
    return `https://admin.shopify.com/store/${storeHandle}/charges/${appHandle}/pricing_plans`
  }

  async function fetchActiveSubscription(shopifyGid) {
    const response = await fetchImpl(
      `https://partners.shopify.com/${organizationId}/api/${apiVersion}/graphql.json`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-shopify-access-token': accessToken
        },
        body: JSON.stringify({
          query: ACTIVE_SUBSCRIPTION_QUERY,
          variables: { appId, shopId: shopifyGid }
        })
      }
    )
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || payload.errors?.length) throw new Error('shopify_pricing_query_failed')
    return payload.data?.activeSubscription || null
  }

  async function persistSubscription(store, activeSubscription) {
    if (!activeSubscription) {
      await database.query(
        `update public.store_subscriptions
         set status = case when status in ('active', 'trialing', 'past_due', 'paused')
              then 'canceled'::public.store_subscription_status else status end,
             cancel_at_period_end = false,
             current_period_start = null,
             current_period_end = null,
             updated_at = now()
         where storefront_id = $1`,
        [store.storefront_id]
      )
      return null
    }

    const item = activeSubscription.items?.find(candidate => candidate.price?.active !== false)
    const planKey = internalPlanKey(item?.handle)
    if (!planKey) throw new Error('shopify_pricing_plan_missing')
    const unitAmount = moneyToMinorUnits(item?.price?.amount)
    const status = activeSubscription.trialEndsAt ? 'trialing' : 'active'
    const currencyCode = String(item?.price?.currency || 'USD').toUpperCase()

    await database.query(
      `update public.store_subscriptions
       set plan_key = $2,
           status = $3::public.store_subscription_status,
           unit_amount = coalesce($4, unit_amount),
           currency_code = $5,
           provider = 'shopify_app_pricing',
           provider_customer_id = $6,
           current_period_start = $7,
           current_period_end = coalesce($8, $9),
           cancel_at_period_end = $10,
           provider_checkout_session_id = null,
           provider_checkout_url = null,
           checkout_expires_at = null,
           updated_at = now()
       where storefront_id = $1`,
      [
        store.storefront_id,
        planKey,
        status,
        unitAmount,
        currencyCode,
        store.shopify_gid,
        activeSubscription.currentBillingCycle?.startTime || null,
        activeSubscription.currentBillingCycle?.endTime || null,
        activeSubscription.trialEndsAt || null,
        Boolean(activeSubscription.cancelAtEndOfCycle)
      ]
    )
    return { planKey, status, unitAmount, currencyCode }
  }

  async function storeForUser(userId, storefrontId) {
    const result = await database.query(
      `select storefront.id::text as storefront_id, store.shopify_gid,
              store.current_myshopify_domain, membership.role::text as workspace_role
       from public.storefronts storefront
       join public.shopify_stores store on store.id = storefront.shopify_store_id
       join public.workspace_memberships membership on membership.workspace_id = store.workspace_id
       where storefront.id = $1 and membership.user_id = $2
       limit 1`,
      [storefrontId, userId]
    )
    const store = result.rows[0]
    if (!store) throw new Error('storefront_access_denied')
    if (!['owner', 'admin'].includes(store.workspace_role)) throw new Error('storefront_billing_denied')
    return store
  }

  async function storeForShop(shop) {
    const normalizedShop = normalizeShop(shop)
    const result = await database.query(
      `select storefront.id::text as storefront_id, store.shopify_gid,
              store.current_myshopify_domain
       from public.shopify_stores store
       join public.storefronts storefront on storefront.shopify_store_id = store.id
       left join public.shopify_domain_aliases alias on alias.shopify_store_id = store.id
       where lower(store.installed_myshopify_domain) = $1
          or lower(store.current_myshopify_domain) = $1
          or lower(alias.myshopify_domain) = $1
       limit 1`,
      [normalizedShop]
    )
    if (!result.rows[0]) throw new Error('shopify_store_not_found')
    return result.rows[0]
  }

  async function createPlanSelection({ userId, storefrontId }) {
    const store = await storeForUser(userId, storefrontId)
    return { checkoutUrl: planSelectionUrl(store.current_myshopify_domain) }
  }

  async function synchronize({ userId, storefrontId }) {
    const store = await storeForUser(userId, storefrontId)
    const activeSubscription = await fetchActiveSubscription(store.shopify_gid)
    return { subscription: await persistSubscription(store, activeSubscription) }
  }

  async function handleCallback({ shop, planHandle }) {
    const store = await storeForShop(shop)
    const activeSubscription = await fetchActiveSubscription(store.shopify_gid)
    const subscription = await persistSubscription(store, activeSubscription)
    if (!subscription || internalPlanKey(planHandle) !== subscription.planKey) {
      throw new Error('shopify_pricing_not_active')
    }
    const redirectUrl = new URL(`/setup/${store.storefront_id}`, platformUrl)
    redirectUrl.searchParams.set('billing', 'success')
    return { redirectUrl: redirectUrl.toString(), subscription }
  }

  return { createPlanSelection, handleCallback, planSelectionUrl, synchronize }
}
