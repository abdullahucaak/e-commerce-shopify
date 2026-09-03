<script setup>
import { computed } from 'vue'
import { useAccountStore } from '../stores/account.js'
import { storeCardState } from '../services/storePresentation.js'

const account = useAccountStore()
const stores = computed(() => account.workspace?.stores || [])
const subscriptions = computed(() => stores.value.map(store => ({
  store,
  subscription: store.storefront?.subscription || null,
  presentation: storeCardState(store)
})))
const totalMonthlyAmount = computed(() => subscriptions.value.reduce((total, item) => {
  return ['active', 'trialing'].includes(item.subscription?.status)
    ? total + Number(item.subscription?.unitAmount || 0)
    : total
}, 0))

function formatMoney(unitAmount, currencyCode = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode })
    .format(Number(unitAmount || 0) / 100)
}
</script>

<template>
  <div class="shell">
    <aside><p class="brand">YourProStore</p><nav><RouterLink to="/stores">My stores</RouterLink><RouterLink to="/subscriptions">Subscriptions</RouterLink><RouterLink to="/account">My account</RouterLink></nav></aside>
    <main>
      <header><div><p class="eyebrow">Merchant account</p><h1>Subscriptions</h1></div><strong class="monthly-total">Monthly total: {{ formatMoney(totalMonthlyAmount) }}</strong></header>
      <section class="store-grid">
        <article v-for="item in subscriptions" :key="item.store.id" class="card subscription-card">
          <div><h2>{{ item.store.name }}</h2><p class="muted">{{ item.store.myshopifyDomain }}</p><span class="status-badge">{{ item.presentation.statusLabel }}</span></div>
          <div class="subscription-price">
            <strong>{{ formatMoney(item.subscription?.unitAmount, item.subscription?.currencyCode) }} / month</strong>
            <RouterLink v-if="item.store.storefront && item.presentation.action === 'setup'" :to="`/setup/${item.store.storefront.id}`">{{ item.presentation.label }}</RouterLink>
          </div>
        </article>
        <article v-if="!subscriptions.length" class="card empty"><h2>You do not have a subscription yet</h2><p class="muted">Connect a Shopify store first.</p></article>
      </section>
    </main>
  </div>
</template>

<style scoped>
.monthly-total { padding: .75rem 1rem; border-radius: 10px; background: #fff; }
.subscription-card { gap: 1rem; }
.subscription-price { display: grid; justify-items: end; gap: .75rem; }
.status-badge { display: inline-block; padding: .35rem .6rem; border-radius: 999px; color: #42505c; background: #eef2f4; font-size: .72rem; font-weight: 600; }
</style>
