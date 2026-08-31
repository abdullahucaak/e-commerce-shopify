<script setup>
import { computed, ref } from 'vue'
import { useAccountStore } from '../stores/account.js'
import { storeCardState } from '../services/storePresentation.js'
import { openStorefrontAdmin } from '../services/adminHandoff.js'

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
    error.value = 'Mağaza yönetimi açılamadı. Lütfen tekrar giriş yapıp yeniden dene.'
    openingStorefrontId.value = ''
  }
}

async function connectShopify() {
  connecting.value = true
  error.value = ''
  try {
    const response = await fetch('/api/shopify/connect', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${account.session.access_token}` },
      body: JSON.stringify({ workspaceId: account.workspace.id })
    })
    const payload = await response.json()
    if (!response.ok || !payload.authorizationUrl) throw new Error()
    window.location.assign(payload.authorizationUrl)
  } catch {
    error.value = 'Shopify bağlantısı başlatılamadı.'
    connecting.value = false
  }
}
</script>

<template>
  <div class="shell">
    <aside><p class="brand">YourProStore</p><nav><RouterLink to="/stores">Mağazalarım</RouterLink><RouterLink to="/subscriptions">Abonelikler</RouterLink><RouterLink to="/account">Hesabım</RouterLink></nav></aside>
    <main>
      <header><div><p class="eyebrow">Müşteri platformu</p><h1>Mağazalarım</h1></div><button @click="connectShopify">{{ connecting ? 'Shopify açılıyor…' : 'Shopify ile devam et' }}</button></header>
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
          >{{ openingStorefrontId === store.storefront.id ? 'Yönetim açılıyor…' : storeCardState(store).label }}</button>
          <RouterLink v-else-if="store.storefront" :to="`/setup/${store.storefront.id}`">{{ storeCardState(store).label }}</RouterLink>
        </article>
        <article v-if="!stores.length" class="card empty"><h2>Henüz mağazan yok</h2><p class="muted">Shopify hesabınla devam ederek mağazanı seçebilirsin.</p></article>
      </section>
    </main>
  </div>
</template>

<style scoped>
.store-title { display: flex; align-items: center; gap: .75rem; }
.status-badge { padding: .35rem .6rem; border-radius: 999px; color: #42505c; background: #eef2f4; font-size: .72rem; font-weight: 600; }
</style>
