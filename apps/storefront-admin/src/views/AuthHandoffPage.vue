<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const error = ref('')
const yourProStoreUrl = new URL(
  '/stores',
  import.meta.env.VITE_YOURPROSTORE_AI_URL || 'http://127.0.0.1:5175/'
).toString()

onMounted(async () => {
  try {
    const response = await fetch('/api/auth/handoff/exchange', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: route.query.code })
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || !payload.accessToken || !payload.refreshToken) {
      throw new Error(payload.error || 'auth_handoff_failed')
    }
    await authStore.acceptHandoffSession(payload)
    await router.replace(payload.returnPath || '/dashboard')
  } catch {
    error.value = 'Güvenli giriş bağlantısı geçersiz veya süresi dolmuş. YourProStore.ai üzerinden tekrar aç.'
  }
})
</script>

<template>
  <main class="handoff-page">
    <section class="handoff-card">
      <p class="eyebrow">YourProStore.ai</p>
      <h1>Mağaza yönetimi açılıyor</h1>
      <p v-if="error" class="error-message">{{ error }}</p>
      <p v-else>Güvenli oturumun doğrulanıyor…</p>
      <a v-if="error" :href="yourProStoreUrl">YourProStore.ai’a dön</a>
    </section>
  </main>
</template>

<style scoped>
.handoff-page { display: grid; min-height: 100vh; place-items: center; background: #f5f7f9; }
.handoff-card { width: min(520px, calc(100% - 2rem)); padding: 2rem; border: 1px solid #dfe5e9; border-radius: 14px; background: #fff; }
.error-message { color: #b42318; }
.handoff-card a { display: inline-block; margin-top: 1rem; color: #303841; }
</style>
