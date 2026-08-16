import Stripe from 'stripe'
import { STORE_PLAN_CATALOG } from './onboarding.mjs'

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing'])

function objectId(value) {
  if (!value) return null
  return typeof value === 'string' ? value : value.id || null
}

function unixTimestamp(value) {
  return Number.isFinite(Number(value)) ? Number(value) : null
}

function subscriptionPeriod(subscription) {
  const item = subscription?.items?.data?.[0]
  return {
    start: unixTimestamp(item?.current_period_start ?? subscription?.current_period_start),
    end: unixTimestamp(item?.current_period_end ?? subscription?.current_period_end)
  }
}

function subscriptionIdFromInvoice(invoice) {
  if (invoice?.parent?.type === 'subscription_details') {
    return objectId(invoice.parent.subscription_details?.subscription)
  }
  return objectId(invoice?.subscription)
}

function checkoutReturnUrl(baseUrl, storefrontId, result) {
  const url = new URL(`/setup/${encodeURIComponent(storefrontId)}`, baseUrl)
  url.searchParams.set('billing', result)
  return url.toString()
}

export function normalizeStripeSubscriptionStatus(status) {
  if (['active', 'trialing', 'past_due', 'paused', 'canceled', 'incomplete'].includes(status)) {
    return status
  }
  if (status === 'incomplete_expired') return 'canceled'
  if (status === 'unpaid') return 'past_due'
  return 'incomplete'
}

async function beginWebhookEvent(client, event) {
  const inserted = await client.query(
    `insert into private.stripe_webhook_events (
       stripe_event_id, event_type, livemode, stripe_created_at
     ) values ($1, $2, $3, to_timestamp($4))
     on conflict (stripe_event_id) do nothing
     returning stripe_event_id`,
    [event.id, event.type, Boolean(event.livemode), Number(event.created)]
  )
  return Boolean(inserted.rows[0])
}

async function finishWebhookEvent(client, eventId) {
  await client.query(
    `update private.stripe_webhook_events
     set processed_at = now()
     where stripe_event_id = $1`,
    [eventId]
  )
}

async function synchronizeStorefrontStatus(client, storefrontId, subscriptionStatus) {
  await client.query(
    `update public.storefronts storefront
     set status = case
       when $2 = any($3::text[])
         and exists (
           select 1 from public.onboarding_progress progress
           where progress.storefront_id = storefront.id
             and progress.step_key = 'publish'
             and progress.status = 'completed'
         )
         and exists (
           select 1 from public.shopify_stores store
           where store.id = storefront.shopify_store_id and store.status = 'active'
         )
         then 'active'::public.storefront_status
       when not ($2 = any($3::text[])) and storefront.status = 'active'
         then 'suspended'::public.storefront_status
       else storefront.status
     end,
     updated_at = now()
     where storefront.id = $1`,
    [storefrontId, subscriptionStatus, [...ACTIVE_SUBSCRIPTION_STATUSES]]
  )
}

async function applySubscriptionEvent({ database, event, subscription, storefrontHint = null, clearCheckout = false }) {
  const providerSubscriptionId = objectId(subscription?.id)
  const storefrontId = subscription?.metadata?.storefront_id || storefrontHint
  const providerCustomerId = objectId(subscription?.customer)
  const status = normalizeStripeSubscriptionStatus(subscription?.status)
  const period = subscriptionPeriod(subscription)
  const client = await database.connect()

  try {
    await client.query('begin')
    if (!await beginWebhookEvent(client, event)) {
      await client.query('commit')
      return { duplicate: true }
    }

    const existing = storefrontId
      ? await client.query(
        `select storefront_id::text, provider_subscription_id, status::text
         from public.store_subscriptions
         where storefront_id = $1
         for update`,
        [storefrontId]
      )
      : await client.query(
        `select storefront_id::text, provider_subscription_id, status::text
         from public.store_subscriptions
         where provider = 'stripe' and provider_subscription_id = $1
         for update`,
        [providerSubscriptionId]
      )

    const row = existing.rows[0]
    if (!row) {
      await finishWebhookEvent(client, event.id)
      await client.query('commit')
      return { ignored: true }
    }
    if (
      row.provider_subscription_id &&
      row.provider_subscription_id !== providerSubscriptionId &&
      !(row.status === 'canceled' && status !== 'canceled')
    ) {
      await finishWebhookEvent(client, event.id)
      await client.query('commit')
      return { ignored: true, reason: 'different_store_subscription' }
    }

    const updated = await client.query(
      `update public.store_subscriptions
       set status = $2::public.store_subscription_status,
           provider_customer_id = coalesce($3, provider_customer_id),
           provider_subscription_id = coalesce($4, provider_subscription_id),
           current_period_start = case when $5::bigint is null then null else to_timestamp($5) end,
           current_period_end = case when $6::bigint is null then null else to_timestamp($6) end,
           cancel_at_period_end = $7,
           canceled_at = case when $8::bigint is null then null else to_timestamp($8) end,
           provider_event_created_at = to_timestamp($9),
           provider_checkout_session_id = case when $10 then null else provider_checkout_session_id end,
           provider_checkout_url = case when $10 then null else provider_checkout_url end,
           checkout_expires_at = case when $10 then null else checkout_expires_at end,
           updated_at = now()
       where storefront_id = $1
         and (
           provider_event_created_at is null
           or provider_event_created_at <= to_timestamp($9)
         )
       returning storefront_id::text`,
      [
        row.storefront_id,
        status,
        providerCustomerId,
        providerSubscriptionId,
        period.start,
        period.end,
        Boolean(subscription?.cancel_at_period_end),
        unixTimestamp(subscription?.canceled_at),
        Number(event.created),
        clearCheckout
      ]
    )

    if (updated.rows[0]) {
      await synchronizeStorefrontStatus(client, row.storefront_id, status)
    }
    await finishWebhookEvent(client, event.id)
    await client.query('commit')
    return { processed: true, storefrontId: row.storefront_id, status }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

async function expireCheckoutSession({ database, event, session }) {
  const storefrontId = session?.metadata?.storefront_id
  const client = await database.connect()
  try {
    await client.query('begin')
    if (!await beginWebhookEvent(client, event)) {
      await client.query('commit')
      return { duplicate: true }
    }
    if (storefrontId) {
      await client.query(
        `update public.store_subscriptions
         set provider_checkout_session_id = null,
             provider_checkout_url = null,
             checkout_expires_at = null,
             updated_at = now()
         where storefront_id = $1 and provider_checkout_session_id = $2`,
        [storefrontId, session.id]
      )
    }
    await finishWebhookEvent(client, event.id)
    await client.query('commit')
    return { processed: true }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

export function createStripeBillingService({
  database,
  secretKey,
  webhookSecret,
  customerPlatformUrl,
  priceIds,
  stripeClient = null
}) {
  if (!database?.connect || !database?.query) {
    throw new Error('database.query and database.connect are required.')
  }
  if (!webhookSecret) throw new Error('Stripe webhook secret is required.')
  if (!customerPlatformUrl) throw new Error('Customer platform URL is required.')

  const stripe = stripeClient || new Stripe(secretKey)
  const validatedPrices = new Map()

  async function validatePrice(planKey, priceId) {
    if (validatedPrices.has(priceId)) return validatedPrices.get(priceId)
    const validation = (async () => {
      const plan = STORE_PLAN_CATALOG.find(candidate => candidate.key === planKey)
      const price = await stripe.prices.retrieve(priceId)
      if (
        !plan ||
        !price?.active ||
        price.type !== 'recurring' ||
        price.recurring?.interval !== plan.billingInterval ||
        price.currency?.toUpperCase() !== plan.currencyCode ||
        price.unit_amount !== plan.unitAmount
      ) {
        throw new Error('store_plan_price_mismatch')
      }
      return price
    })()
    validatedPrices.set(priceId, validation)
    try {
      return await validation
    } catch (error) {
      validatedPrices.delete(priceId)
      throw error
    }
  }

  async function createCheckout({ userId, userEmail, storefrontId }) {
    const client = await database.connect()
    try {
      await client.query('begin')
      const access = await client.query(
        `select storefront.id, membership.role::text as workspace_role
         from public.storefronts storefront
         join public.shopify_stores store on store.id = storefront.shopify_store_id
         join public.workspace_memberships membership
           on membership.workspace_id = store.workspace_id and membership.user_id = $2
         where storefront.id = $1`,
        [storefrontId, userId]
      )
      if (!access.rows[0]) throw new Error('storefront_access_denied')
      if (!['owner', 'admin'].includes(access.rows[0].workspace_role)) {
        throw new Error('storefront_billing_denied')
      }

      const result = await client.query(
        `select plan_key, status::text, provider_customer_id, provider_subscription_id,
                provider_checkout_session_id, provider_checkout_url,
                checkout_expires_at, checkout_attempt
         from public.store_subscriptions
         where storefront_id = $1
         for update`,
        [storefrontId]
      )
      const subscription = result.rows[0]
      if (!subscription?.plan_key) throw new Error('store_plan_not_selected')
      if (ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) {
        throw new Error('store_subscription_already_active')
      }
      if (
        subscription.provider_subscription_id &&
        ['incomplete', 'past_due', 'paused'].includes(subscription.status)
      ) {
        throw new Error('store_subscription_requires_management')
      }

      const priceId = priceIds?.[subscription.plan_key]
      if (!priceId) throw new Error('store_plan_price_unavailable')

      if (
        subscription.provider_checkout_session_id &&
        subscription.provider_checkout_url &&
        subscription.checkout_expires_at &&
        new Date(subscription.checkout_expires_at).getTime() > Date.now()
      ) {
        await client.query('commit')
        return {
          checkoutUrl: subscription.provider_checkout_url,
          sessionId: subscription.provider_checkout_session_id,
          reused: true
        }
      }

      await validatePrice(subscription.plan_key, priceId)

      const attempt = Number(subscription.checkout_attempt || 0) + 1
      const successUrl = `${checkoutReturnUrl(customerPlatformUrl, storefrontId, 'success')}&session_id={CHECKOUT_SESSION_ID}`
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: checkoutReturnUrl(customerPlatformUrl, storefrontId, 'cancelled'),
        client_reference_id: storefrontId,
        ...(subscription.provider_customer_id
          ? { customer: subscription.provider_customer_id }
          : userEmail ? { customer_email: userEmail } : {}),
        metadata: {
          storefront_id: storefrontId,
          plan_key: subscription.plan_key
        },
        subscription_data: {
          metadata: {
            storefront_id: storefrontId,
            plan_key: subscription.plan_key
          }
        }
      }, {
        idempotencyKey: `storefront:${storefrontId}:checkout:${attempt}`
      })

      if (!session?.id || !session.url) throw new Error('stripe_checkout_session_invalid')
      await client.query(
        `update public.store_subscriptions
         set provider_checkout_session_id = $2,
             provider_checkout_url = $3,
             checkout_expires_at = to_timestamp($4),
             checkout_attempt = $5,
             provider_subscription_id = case
               when status = 'canceled' then null else provider_subscription_id
             end,
             updated_at = now()
         where storefront_id = $1`,
        [storefrontId, session.id, session.url, Number(session.expires_at), attempt]
      )
      await client.query('commit')
      return { checkoutUrl: session.url, sessionId: session.id, reused: false }
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  }

  async function createPortal({ userId, storefrontId }) {
    const result = await database.query(
      `select subscription.provider_customer_id, membership.role::text as workspace_role
       from public.storefronts storefront
       join public.shopify_stores store on store.id = storefront.shopify_store_id
       join public.workspace_memberships membership
         on membership.workspace_id = store.workspace_id and membership.user_id = $2
       left join public.store_subscriptions subscription on subscription.storefront_id = storefront.id
       where storefront.id = $1`,
      [storefrontId, userId]
    )
    const row = result.rows[0]
    if (!row) throw new Error('storefront_access_denied')
    if (!['owner', 'admin'].includes(row.workspace_role)) {
      throw new Error('storefront_billing_denied')
    }
    if (!row.provider_customer_id) throw new Error('stripe_customer_unavailable')

    const session = await stripe.billingPortal.sessions.create({
      customer: row.provider_customer_id,
      return_url: checkoutReturnUrl(customerPlatformUrl, storefrontId, 'portal_return')
    })
    if (!session?.url) throw new Error('stripe_portal_session_invalid')
    return { portalUrl: session.url }
  }

  async function handleWebhook({ rawBody, signature }) {
    if (!rawBody || !signature) throw new Error('invalid_stripe_webhook_request')
    let event
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
    } catch {
      throw new Error('invalid_stripe_webhook_signature')
    }

    if (event.type === 'checkout.session.expired') {
      return expireCheckoutSession({ database, event, session: event.data.object })
    }

    let subscription = null
    let storefrontHint = null
    let clearCheckout = false
    if ([
      'checkout.session.completed',
      'checkout.session.async_payment_succeeded',
      'checkout.session.async_payment_failed'
    ].includes(event.type)) {
      const session = event.data.object
      const subscriptionId = objectId(session.subscription)
      if (!subscriptionId) return { ignored: true }
      subscription = await stripe.subscriptions.retrieve(subscriptionId)
      storefrontHint = session.metadata?.storefront_id || session.client_reference_id || null
      clearCheckout = true
    } else if ([
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'customer.subscription.paused',
      'customer.subscription.resumed'
    ].includes(event.type)) {
      subscription = event.data.object
    } else if (['invoice.paid', 'invoice.payment_failed'].includes(event.type)) {
      const subscriptionId = subscriptionIdFromInvoice(event.data.object)
      if (!subscriptionId) return { ignored: true }
      subscription = await stripe.subscriptions.retrieve(subscriptionId)
    } else {
      return { ignored: true }
    }

    return applySubscriptionEvent({
      database,
      event,
      subscription,
      storefrontHint,
      clearCheckout
    })
  }

  return { createCheckout, createPortal, handleWebhook }
}
