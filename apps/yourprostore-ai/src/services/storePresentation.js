const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing'])
const BILLING_ATTENTION_STATUSES = new Set(['past_due', 'paused', 'canceled'])

export function storeCardState(store) {
  const storefront = store?.storefront
  const subscriptionStatus = storefront?.subscription?.status || 'incomplete'

  if (storefront?.status === 'active' && ACTIVE_SUBSCRIPTION_STATUSES.has(subscriptionStatus)) {
    return { label: 'Manage store', statusLabel: 'Active', action: 'manage' }
  }

  if (BILLING_ATTENTION_STATUSES.has(subscriptionStatus)) {
    const statusLabel = subscriptionStatus === 'past_due'
      ? 'Payment due'
      : subscriptionStatus === 'paused'
        ? 'Paused'
        : 'Subscription canceled'
    return { label: 'Fix payment', statusLabel, action: 'setup' }
  }

  if (storefront?.subscription?.planKey && subscriptionStatus === 'incomplete') {
    return { label: 'Complete payment', statusLabel: 'Payment incomplete', action: 'setup' }
  }

  return { label: 'Continue setup', statusLabel: 'Setup in progress', action: 'setup' }
}
