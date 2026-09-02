<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminAuthStore } from '../stores/adminAuth.js'

const auth = useAdminAuthStore()
const router = useRouter()
const code = ref('')
const error = ref('')
const enrolling = computed(() => Boolean(auth.enrollment))

onMounted(async () => {
  if (!auth.factors.length && !auth.enrollment) {
    try { await auth.enrollTotp() } catch { error.value = 'TOTP kurulumu başlatılamadı.' }
  }
})

async function verify() {
  error.value = ''
  try {
    await auth.verifyTotp(code.value)
    await router.replace('/dashboard')
  } catch { error.value = 'Kod doğrulanamadı veya platform admin yetkisi bulunamadı.' }
}
</script>

<template>
  <main class="centered-page">
    <section class="panel auth-panel">
      <div class="eyebrow">ZORUNLU MFA</div>
      <h1>{{ enrolling ? 'Authenticator’ı bağlayın' : 'İkinci faktörü doğrulayın' }}</h1>
      <p class="muted">Platform yönetimi yalnız AAL2 oturumla açılır.</p>
      <img v-if="auth.enrollment?.totp?.qr_code" class="qr" :src="auth.enrollment.totp.qr_code" alt="TOTP QR kodu">
      <p v-if="error" class="notice">{{ error }}</p>
      <form @submit.prevent="verify">
        <label>6 haneli kod<input v-model="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required></label>
        <button>Doğrula ve devam et</button>
      </form>
      <button class="secondary" @click="auth.signOut().then(() => router.replace('/login'))">Çıkış yap</button>
    </section>
  </main>
</template>
