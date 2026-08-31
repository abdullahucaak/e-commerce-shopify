const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing'])
const BILLING_ATTENTION_STATUSES = new Set(['past_due', 'paused', 'canceled'])

export function storeCardState(store) {
  const storefront = store?.storefront
  const subscriptionStatus = storefront?.subscription?.status || 'incomplete'

  if (storefront?.status === 'active' && ACTIVE_SUBSCRIPTION_STATUSES.has(subscriptionStatus)) {
    return { label: 'Mağazayı yönet', statusLabel: 'Aktif', action: 'manage' }
  }

  if (BILLING_ATTENTION_STATUSES.has(subscriptionStatus)) {
    const statusLabel = subscriptionStatus === 'past_due'
      ? 'Ödeme bekliyor'
      : subscriptionStatus === 'paused'
        ? 'Duraklatıldı'
        : 'Abonelik iptal edildi'
    return { label: 'Ödemeyi düzelt', statusLabel, action: 'setup' }
  }

  if (storefront?.subscription?.planKey && subscriptionStatus === 'incomplete') {
    return { label: 'Ödemeyi tamamla', statusLabel: 'Ödeme tamamlanmadı', action: 'setup' }
  }

  return { label: 'Kuruluma devam et', statusLabel: 'Kurulum devam ediyor', action: 'setup' }
}
