<script setup>
import { computed, ref } from 'vue'
import { useAccountStore } from '../stores/account.js'

const account = useAccountStore()
const stores = computed(() => account.workspace?.stores || [])
const connecting = ref(false)
const error = ref('')

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
    <aside><p class="brand">YourProStore</p><nav><RouterLink to="/stores">Mağazalarım</RouterLink><span>Abonelikler</span><span>Hesabım</span></nav></aside>
    <main>
      <header><div><p class="eyebrow">Müşteri platformu</p><h1>Mağazalarım</h1></div><button @click="connectShopify">{{ connecting ? 'Shopify açılıyor…' : 'Shopify ile devam et' }}</button></header>
      <p v-if="error" class="notice error">{{ error }}</p>
      <section class="store-grid">
        <article v-for="store in stores" :key="store.id" class="card">
          <div><h2>{{ store.name }}</h2><p class="muted">{{ store.myshopifyDomain }}</p></div>
          <RouterLink v-if="store.storefront" :to="`/setup/${store.storefront.id}`">Kuruluma devam et</RouterLink>
        </article>
        <article v-if="!stores.length" class="card empty"><h2>Henüz mağazan yok</h2><p class="muted">Shopify hesabınla devam ederek mağazanı seçebilirsin.</p></article>
      </section>
    </main>
  </div>
</template>
