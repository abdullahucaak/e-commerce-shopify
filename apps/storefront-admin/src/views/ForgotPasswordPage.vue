<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/authStore'

const authStore = useAuthStore()
const email = ref('')
const submitted = ref(false)
const errorMessage = ref('')

async function submit() {
  errorMessage.value = ''
  try {
    await authStore.requestPasswordReset(email.value)
    submitted.value = true
  } catch {
    errorMessage.value = 'Sıfırlama e-postası gönderilemedi. Biraz sonra tekrar dene.'
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-card" aria-labelledby="forgot-password-title">
      <div class="auth-logo">
        <span class="wordmark">YourProStore.ai</span>
        <span class="wordmark-subtitle">storefront admin</span>
      </div>
      <h1 id="forgot-password-title">Şifreni sıfırla</h1>
      <p class="description">Hesabındaki e-posta adresini gir. Yeni şifre belirleyebileceğin güvenli bağlantıyı göndereceğiz.</p>

      <div v-if="!authStore.isConfigured" class="notice error" role="alert">Supabase Auth henüz yapılandırılmadı.</div>
      <div v-else-if="submitted" class="notice success" role="status">
        Hesap bu e-posta adresiyle eşleşiyorsa sıfırlama bağlantısı gönderildi. Gelen kutunu ve spam klasörünü kontrol et.
      </div>
      <div v-if="errorMessage" class="notice error" role="alert">{{ errorMessage }}</div>

      <form v-if="!submitted" @submit.prevent="submit">
        <label for="recovery-email">E-posta adresi</label>
        <input id="recovery-email" v-model.trim="email" type="email" autocomplete="email" required>
        <button :disabled="authStore.loading || !authStore.isConfigured">
          {{ authStore.loading ? 'Gönderiliyor…' : 'Sıfırlama bağlantısı gönder' }}
        </button>
      </form>
      <RouterLink class="back-link" to="/login">Giriş ekranına dön</RouterLink>
    </section>
  </main>
</template>

<style scoped>
.auth-page{display:grid;min-height:100vh;place-items:center;padding:1.5rem;background:var(--color-surface-subtle)}.auth-card{display:grid;width:min(100%,440px);gap:1rem;padding:2rem;border:1px solid var(--color-border-light);border-radius:14px;background:var(--color-surface);box-shadow:0 18px 55px rgba(27,36,48,.12)}.auth-logo{display:flex;flex-direction:column;align-items:center}.wordmark{font-size:1.75rem;font-weight:750!important;letter-spacing:-.04em}.wordmark-subtitle{color:var(--color-text-muted);font-size:.72rem;letter-spacing:.12em;text-transform:uppercase}h1{margin:.5rem 0 0}.description{margin:0;color:var(--color-text-secondary);line-height:1.5}form{display:grid;gap:.75rem}label{color:var(--color-text-secondary);font-size:.9rem}input,button{padding:.8rem;border:1px solid var(--color-border-light);border-radius:8px}button{color:#fff;background:var(--color-brand-secondary);cursor:pointer}button:disabled{cursor:not-allowed;opacity:.65}.notice{padding:.8rem 1rem;border-radius:9px}.success{color:var(--color-success);background:var(--color-success-soft)}.error{color:var(--color-danger);background:#fdf0ef}.back-link{color:var(--color-brand-secondary);text-align:center}
</style>
