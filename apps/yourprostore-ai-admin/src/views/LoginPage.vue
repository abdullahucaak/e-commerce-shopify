<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdminAuthStore } from '../stores/adminAuth.js'

const auth = useAdminAuthStore()
const router = useRouter()
const route = useRoute()
const email = ref('')
const password = ref('')
const message = ref(route.query.denied === '1' ? 'Bu hesap platform yönetimi için yetkili değil.' : '')

async function submit() {
  message.value = ''
  try {
    await auth.signIn(email.value, password.value)
    await router.replace(auth.requiresMfa ? '/mfa' : '/dashboard')
  } catch (error) {
    message.value = error.message === 'platform_admin_access_denied'
      ? 'Bu hesap platform yönetimi için yetkili değil.'
      : 'Giriş doğrulanamadı. Bilgileri ve admin yetkisini kontrol edin.'
  }
}
</script>

<template>
  <main class="centered-page">
    <form class="panel auth-panel" @submit.prevent="submit">
      <div class="eyebrow">INTERNAL OPERATIONS</div>
      <h1>YourProStore Admin</h1>
      <p class="muted">Yalnız yetkilendirilmiş platform ekibi içindir. Müşteri hesabı burada çalışmaz.</p>
      <p v-if="message" class="notice">{{ message }}</p>
      <label>E-posta<input v-model="email" type="email" autocomplete="username" required></label>
      <label>Şifre<input v-model="password" type="password" autocomplete="current-password" required></label>
      <button :disabled="auth.loading">{{ auth.loading ? 'Doğrulanıyor…' : 'Giriş yap' }}</button>
    </form>
  </main>
</template>
