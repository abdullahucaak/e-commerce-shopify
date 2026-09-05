<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAccountStore } from '../stores/account.js'
import { storeCardState } from '../services/storePresentation.js'
import { openStorefrontAdmin } from '../services/adminHandoff.js'
import { selectedShopFromSearch, shopifyConnectPayload } from '../services/shopifyConnection.js'

const account = useAccountStore()
const stores = computed(() => account.workspace?.stores || [])
const connecting = ref(false)
const error = ref('')
const openingStorefrontId = ref('')

async function manageStore(storefrontId) {
  openingStorefrontId.value = storefrontId
  error.value = ''
  try {
    await openStorefrontAdmin({ session: account.session, storefrontId })
  } catch {
    error.value = 'Store management could not be opened. Please log in again and retry.'
    openingStorefrontId.value = ''
  }
}

async function connectShopify(shop = null) {
  connecting.value = true
  error.value = ''
  try {
    const response = await fetch('/api/shopify/connect', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${account.session.access_token}` },
      body: JSON.stringify(shopifyConnectPayload(account.workspace.id, shop))
    })
    const payload = await response.json()
    if (!response.ok || !payload.authorizationUrl) throw new Error()
    window.location.assign(payload.authorizationUrl)
  } catch {
    error.value = 'The Shopify connection could not be started.'
    connecting.value = false
  }
}

onMounted(() => {
  const selectedShop = selectedShopFromSearch(window.location.search)
  if (selectedShop) connectShopify(selectedShop)
})
</script>

<template>
  <div class="shell">
    <aside><p class="brand">YourProStore</p><nav><RouterLink to="/stores">My stores</RouterLink><RouterLink to="/subscriptions">Subscriptions</RouterLink><RouterLink to="/account">My account</RouterLink></nav></aside>
    <main>
      <header><div><p class="eyebrow">Merchant platform</p><h1>My stores</h1></div><button @click="connectShopify()">{{ connecting ? 'Opening Shopify…' : 'Continue with Shopify' }}</button></header>
      <p v-if="error" class="notice error">{{ error }}</p>
      <section class="store-grid">
        <article v-for="store in stores" :key="store.id" class="card">
          <div>
            <div class="store-title"><h2>{{ store.name }}</h2><span class="status-badge">{{ storeCardState(store).statusLabel }}</span></div>
            <p class="muted">{{ store.myshopifyDomain }}</p>
          </div>
          <button
            v-if="store.storefront && storeCardState(store).action === 'manage'"
            :disabled="openingStorefrontId === store.storefront.id"
            @click="manageStore(store.storefront.id)"
          >{{ openingStorefrontId === store.storefront.id ? 'Opening management…' : storeCardState(store).label }}</button>
          <RouterLink v-else-if="store.storefront" :to="`/setup/${store.storefront.id}`">{{ storeCardState(store).label }}</RouterLink>
        </article>
        <article v-if="!stores.length" class="card empty"><h2>You do not have a store yet</h2><p class="muted">Continue with your Shopify account to select a store.</p></article>
      </section>
    </main>
  </div>
</template>

<style scoped>
.store-title { display: flex; align-items: center; gap: .75rem; }
.status-badge { padding: .35rem .6rem; border-radius: 999px; color: #42505c; background: #eef2f4; font-size: .72rem; font-weight: 600; }
</style>
