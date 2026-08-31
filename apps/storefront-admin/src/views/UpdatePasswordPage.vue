<script setup>
import { computed, ref } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { validateNewPassword } from '../services/passwordRecovery'

const authStore = useAuthStore()
const password = ref('')
const confirmation = ref('')
const completed = ref(false)
const errorMessage = ref('')
const hasRecoverySession = computed(() => authStore.isAuthenticated)

async function submit() {
  errorMessage.value = ''
  const validationError = validateNewPassword(password.value, confirmation.value)
  if (validationError === 'password_too_short') {
    errorMessage.value = 'Yeni şifre en az 8 karakter olmalı.'
    return
  }
  if (validationError === 'password_confirmation_mismatch') {
    errorMessage.value = 'Şifreler birbiriyle eşleşmiyor.'
    return
  }

  try {
    await authStore.updatePassword(password.value)
    password.value = ''
    confirmation.value = ''
    completed.value = true
  } catch {
    errorMessage.value = 'Şifre güncellenemedi. Bağlantının süresi dolmuş olabilir; yeniden sıfırlama bağlantısı iste.'
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-card" aria-labelledby="update-password-title">
      <div class="auth-logo">
        <span class="wordmark">YourProStore.ai</span>
        <span class="wordmark-subtitle">storefront admin</span>
      </div>
      <h1 id="update-password-title">Yeni şifre belirle</h1>

      <div v-if="completed" class="notice success" role="status">
        Şifren güncellendi. Kurtarma oturumunla mağaza yönetimine devam edebilirsin.
      </div>
      <div v-else-if="!hasRecoverySession" class="notice error" role="alert">
        Geçerli bir kurtarma oturumu bulunamadı. Bağlantı kullanılmış veya süresi dolmuş olabilir.
      </div>
      <div v-if="errorMessage" class="notice error" role="alert">{{ errorMessage }}</div>

      <form v-if="hasRecoverySession && !completed" @submit.prevent="submit">
        <label for="new-password">Yeni şifre</label>
        <input id="new-password" v-model="password" type="password" autocomplete="new-password" minlength="8" required>
        <label for="new-password-confirmation">Yeni şifreyi tekrar yaz</label>
        <input id="new-password-confirmation" v-model="confirmation" type="password" autocomplete="new-password" minlength="8" required>
        <small>En az 8 karakter kullan.</small>
        <button :disabled="authStore.loading">{{ authStore.loading ? 'Güncelleniyor…' : 'Şifreyi güncelle' }}</button>
      </form>

      <RouterLink v-if="completed" class="primary-link" to="/dashboard">Yönetim paneline devam et</RouterLink>
      <RouterLink v-else-if="!hasRecoverySession" class="primary-link" to="/forgot-password">Yeni bağlantı iste</RouterLink>
      <RouterLink class="back-link" to="/login">Giriş ekranına dön</RouterLink>
    </section>
  </main>
</template>

<style scoped>
.auth-page{display:grid;min-height:100vh;place-items:center;padding:1.5rem;background:var(--color-surface-subtle)}.auth-card{display:grid;width:min(100%,440px);gap:1rem;padding:2rem;border:1px solid var(--color-border-light);border-radius:14px;background:var(--color-surface);box-shadow:0 18px 55px rgba(27,36,48,.12)}.auth-logo{display:flex;flex-direction:column;align-items:center}.wordmark{font-size:1.75rem;font-weight:750!important;letter-spacing:-.04em}.wordmark-subtitle{color:var(--color-text-muted);font-size:.72rem;letter-spacing:.12em;text-transform:uppercase}h1{margin:.5rem 0 0}form{display:grid;gap:.75rem}label{color:var(--color-text-secondary);font-size:.9rem}input,button{padding:.8rem;border:1px solid var(--color-border-light);border-radius:8px}button{color:#fff;background:var(--color-brand-secondary);cursor:pointer}button:disabled{cursor:not-allowed;opacity:.65}small{color:var(--color-text-muted)}.notice{padding:.8rem 1rem;border-radius:9px}.success{color:var(--color-success);background:var(--color-success-soft)}.error{color:var(--color-danger);background:#fdf0ef}.primary-link{padding:.8rem;border-radius:8px;color:#fff;background:var(--color-brand-secondary);text-align:center;text-decoration:none}.back-link{color:var(--color-brand-secondary);text-align:center}
</style>
