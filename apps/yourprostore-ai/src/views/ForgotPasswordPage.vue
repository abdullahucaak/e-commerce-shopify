<script setup>
import { ref } from 'vue'
import { useAccountStore } from '../stores/account.js'

const account = useAccountStore()
const email = ref('')
const loading = ref(false)
const submitted = ref(false)
const error = ref('')

async function submit() {
  loading.value = true
  error.value = ''
  try {
    await account.requestPasswordReset(email.value)
    submitted.value = true
  } catch {
    error.value = 'Sıfırlama e-postası gönderilemedi. Biraz sonra tekrar dene.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-card">
      <RouterLink class="auth-brand" to="/">YourProStore</RouterLink>
      <h1>Şifreni sıfırla</h1>
      <p class="muted">Hesabındaki e-posta adresini gir. Yeni şifre belirleyebileceğin güvenli bağlantıyı göndereceğiz.</p>
      <p v-if="submitted" class="notice success">
        Hesap bu e-posta adresiyle eşleşiyorsa sıfırlama bağlantısı gönderildi. Gelen kutunu ve spam klasörünü kontrol et.
      </p>
      <p v-if="error" class="notice error">{{ error }}</p>
      <form v-if="!submitted" class="recovery-form" @submit.prevent="submit">
        <label>E-posta adresi<input v-model.trim="email" type="email" autocomplete="email" required></label>
        <button :disabled="loading">{{ loading ? 'Gönderiliyor…' : 'Sıfırlama bağlantısı gönder' }}</button>
      </form>
      <RouterLink class="text-link centered" to="/login">Giriş ekranına dön</RouterLink>
    </section>
  </main>
</template>

<style scoped>
.recovery-form{display:grid;gap:1rem}.centered{text-align:center}button:disabled{cursor:not-allowed;opacity:.65}
</style>
