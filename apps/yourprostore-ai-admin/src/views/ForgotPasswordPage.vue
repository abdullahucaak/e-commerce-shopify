<script setup>
import { ref } from 'vue'
import { useAdminAuthStore } from '../stores/adminAuth.js'

const auth = useAdminAuthStore()
const email = ref('')
const loading = ref(false)
const submitted = ref(false)
const error = ref('')

async function submit() {
  loading.value = true
  error.value = ''
  try {
    await auth.requestPasswordReset(email.value)
    submitted.value = true
  } catch {
    error.value = 'Sıfırlama e-postası gönderilemedi. Lütfen kısa süre sonra tekrar deneyin.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="centered-page">
    <section class="panel auth-panel">
      <div class="eyebrow">INTERNAL OPERATIONS</div>
      <h1>Şifrenizi sıfırlayın</h1>
      <p class="muted">Platform yöneticisi hesabınızın e-posta adresine güvenli bir bağlantı göndereceğiz.</p>
      <p v-if="submitted" class="notice success">
        Bu e-postayla eşleşen bir hesap varsa sıfırlama bağlantısı gönderildi. Gelen kutusunu ve spam klasörünü kontrol edin.
      </p>
      <p v-if="error" class="notice">{{ error }}</p>
      <form v-if="!submitted" @submit.prevent="submit">
        <label>E-posta<input v-model="email" type="email" autocomplete="email" required></label>
        <button :disabled="loading">{{ loading ? 'Gönderiliyor…' : 'Sıfırlama bağlantısı gönder' }}</button>
      </form>
      <RouterLink class="text-link centered-link" to="/login">Admin girişine dön</RouterLink>
    </section>
  </main>
</template>
