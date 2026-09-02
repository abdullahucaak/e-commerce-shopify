<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminAuthStore } from '../stores/adminAuth.js'
import { fetchPlatformOverview } from '../services/adminSession.js'

const auth = useAdminAuthStore()
const router = useRouter()
const overview = ref(null)
const error = ref('')
onMounted(async () => {
  try {
    overview.value = await fetchPlatformOverview({
      apiUrl: import.meta.env.VITE_API_URL || '', accessToken: auth.session.access_token
    })
  } catch { error.value = 'Platform özeti yüklenemedi.' }
})
async function signOut() { await auth.signOut(); await router.replace('/login') }
</script>

<template>
  <main class="dashboard">
    <header>
      <div><div class="eyebrow">YOURPROSTORE.AI</div><h1>Platform operasyonları</h1></div>
      <button class="secondary" @click="signOut">Çıkış yap</button>
    </header>
    <section class="panel">
      <h2>Güvenli oturum açık</h2>
      <dl>
        <div><dt>Hesap</dt><dd>{{ auth.admin?.email }}</dd></div>
        <div><dt>Platform rolü</dt><dd>{{ auth.admin?.role }}</dd></div>
        <div><dt>Güvence seviyesi</dt><dd>AAL2 · MFA doğrulandı</dd></div>
      </dl>
      <p class="muted">Müşteri, mağaza, abonelik ve operasyon ekranları sonraki adımlarda rol bazlı admin API’lerine bağlanacak.</p>
    </section>
    <p v-if="error" class="notice">{{ error }}</p>
    <section v-if="overview" class="metrics">
      <article><span>Workspace</span><strong>{{ overview.workspaces }}</strong></article>
      <article><span>Shopify mağazası</span><strong>{{ overview.shopifyStores }}</strong></article>
      <article><span>Storefront</span><strong>{{ overview.storefronts }}</strong></article>
      <article><span>Aktif abonelik</span><strong>{{ overview.activeSubscriptions }}</strong></article>
      <article><span>Başarısız webhook</span><strong>{{ overview.failedWebhooks }}</strong></article>
      <article><span>Dead-letter</span><strong>{{ overview.deadLetterWebhooks }}</strong></article>
    </section>
    <RouterLink class="feature-link" to="/workspaces">
      <span><strong>Müşteriler ve workspace’ler</strong><small>Sahip, üyelik ve mağaza sayılarını görüntüle</small></span>
      <b aria-hidden="true">→</b>
    </RouterLink>
    <RouterLink class="feature-link" to="/stores">
      <span><strong>Mağaza ve storefront operasyonları</strong><small>Kurulum, abonelik ve dönem durumlarını görüntüle</small></span>
      <b aria-hidden="true">→</b>
    </RouterLink>
    <RouterLink class="feature-link" to="/operations"><span><strong>Webhook ve audit kayıtları</strong><small>Son operasyon olaylarını güvenli özetlerle incele</small></span><b>→</b></RouterLink>
    <RouterLink class="feature-link" to="/catalog"><span><strong>Niche ve banner kataloğu</strong><small>Aktif içerikleri gerekçe ve audit kaydıyla yönet</small></span><b>→</b></RouterLink>
  </main>
</template>
