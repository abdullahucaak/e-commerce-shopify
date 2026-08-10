<template>
  <main class="auth-page">
    <section class="auth-card" aria-labelledby="auth-title">
      <div class="auth-logo">
        <span class="wordmark">GlowField</span>
        <span class="wordmark-subtitle">commerce platform</span>
      </div>

      <div class="auth-tabs" role="tablist" aria-label="Hesap işlemleri">
        <button
          type="button"
          role="tab"
          :aria-selected="mode === 'login'"
          :class="{ active: mode === 'login' }"
          @click="setMode('login')"
        >
          Giriş yap
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="mode === 'register'"
          :class="{ active: mode === 'register' }"
          @click="setMode('register')"
        >
          Hesap oluştur
        </button>
      </div>

      <h1 id="auth-title">
        {{ mode === 'login' ? 'Mağaza yönetimine giriş' : 'Platform hesabını oluştur' }}
      </h1>
      <p class="auth-description">
        {{ mode === 'login'
          ? 'E-posta adresin ve şifrenle devam et.'
          : 'Hesabın için bir çalışma alanı otomatik oluşturulacak.' }}
      </p>

      <div v-if="!authStore.isConfigured" class="notice notice--error" role="alert">
        Supabase Auth henüz yapılandırılmadı.
      </div>
      <div v-else-if="successMessage" class="notice notice--success" role="status">
        {{ successMessage }}
      </div>
      <div v-if="errorMessage" class="notice notice--error" role="alert">
        {{ errorMessage }}
      </div>

      <form @submit.prevent="handleSubmit">
        <div v-if="mode === 'register'" class="form-group">
          <label for="business-name">Mağaza veya işletme adı</label>
          <input
            id="business-name"
            v-model.trim="businessName"
            type="text"
            autocomplete="organization"
            maxlength="120"
            required
          >
        </div>

        <div class="form-group">
          <label for="email">E-posta adresi</label>
          <input
            id="email"
            v-model.trim="email"
            type="email"
            inputmode="email"
            autocomplete="email"
            required
          >
        </div>

        <div class="form-group">
          <label for="password">Şifre</label>
          <input
            id="password"
            v-model="password"
            type="password"
            :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            minlength="8"
            required
          >
          <small v-if="mode === 'register'">En az 8 karakter kullan.</small>
        </div>

        <button
          class="submit-button"
          type="submit"
          :disabled="authStore.loading || !authStore.isConfigured"
        >
          {{ submitLabel }}
        </button>
      </form>

      <button
        v-if="awaitingConfirmation"
        class="resend-button"
        type="button"
        :disabled="authStore.loading"
        @click="resendConfirmation"
      >
        Doğrulama e-postasını tekrar gönder
      </button>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const mode = ref(route.query.mode === 'register' ? 'register' : 'login')
const businessName = ref('')
const email = ref('')
const password = ref('')
const errorMessage = ref('')
const successMessage = ref(
  route.query.confirmed === '1'
    ? 'E-posta adresin doğrulandı. Giriş yapabilirsin.'
    : ''
)
const awaitingConfirmation = ref(false)

const submitLabel = computed(() => {
  if (authStore.loading) return 'Lütfen bekle...'
  return mode.value === 'login' ? 'Giriş yap' : 'Hesap oluştur'
})

function readableAuthError(error) {
  const message = error?.message?.toLowerCase() || ''

  if (message.includes('invalid login credentials')) {
    return 'E-posta adresi veya şifre hatalı.'
  }
  if (message.includes('email not confirmed')) {
    awaitingConfirmation.value = true
    return 'Önce e-posta adresini doğrulamalısın.'
  }
  if (message.includes('user already registered')) {
    return 'Bu e-posta adresiyle zaten bir hesap bulunuyor.'
  }
  if (message.includes('password')) {
    return 'Şifre güvenlik koşullarını karşılamıyor.'
  }
  return 'İşlem tamamlanamadı. Lütfen tekrar dene.'
}

function setMode(nextMode) {
  mode.value = nextMode
  errorMessage.value = ''
  successMessage.value = ''
  awaitingConfirmation.value = false
}

async function handleSubmit() {
  errorMessage.value = ''
  successMessage.value = ''

  try {
    if (mode.value === 'login') {
      await authStore.signIn({ email: email.value, password: password.value })
      const redirect = typeof route.query.redirect === 'string'
        ? route.query.redirect
        : '/dashboard'
      await router.replace(redirect)
      return
    }

    const data = await authStore.signUp({
      businessName: businessName.value,
      email: email.value,
      password: password.value
    })

    if (data.session) {
      await router.replace('/dashboard')
      return
    }

    awaitingConfirmation.value = true
    password.value = ''
    successMessage.value = 'Hesabın oluşturuldu. E-postandaki doğrulama bağlantısına tıkla.'
  } catch (error) {
    errorMessage.value = readableAuthError(error)
  }
}

async function resendConfirmation() {
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await authStore.resendConfirmation(email.value)
    successMessage.value = 'Doğrulama e-postası yeniden gönderildi.'
  } catch (error) {
    errorMessage.value = readableAuthError(error)
  }
}

onMounted(async () => {
  try {
    await authStore.initialize()
    if (authStore.isAuthenticated) await router.replace('/dashboard')
  } catch (error) {
    errorMessage.value = readableAuthError(error)
  }
})
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 1.5rem;
  background: var(--color-surface-subtle);
}

.auth-card {
  width: min(100%, 440px);
  padding: 2rem;
  border: 1px solid var(--color-border-light);
  border-radius: 14px;
  background: var(--color-surface);
  box-shadow: 0 18px 55px rgba(27, 36, 48, 0.12);
}

.auth-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.wordmark {
  color: var(--color-text-primary);
  font-size: 1.75rem;
  font-weight: 750;
  letter-spacing: -0.04em;
}

.wordmark-subtitle {
  color: var(--color-text-muted);
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.auth-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.25rem;
  padding: 0.25rem;
  margin-bottom: 1.5rem;
  border-radius: 10px;
  background: var(--color-surface-muted);
}

.auth-tabs button {
  padding: 0.7rem;
  border: 0;
  border-radius: 8px;
  color: var(--color-text-secondary);
  background: transparent;
  cursor: pointer;
}

.auth-tabs button.active {
  color: var(--color-text-primary);
  background: var(--color-surface);
  box-shadow: 0 1px 4px rgba(27, 36, 48, 0.12);
}

h1 {
  margin: 0 0 0.5rem;
  color: var(--color-text-primary);
  font-size: var(--font-size-heading-md);
  text-align: center;
}

.auth-description {
  margin: 0 0 1.5rem;
  color: var(--color-text-secondary);
  text-align: center;
}

.form-group {
  margin-bottom: 1rem;
}

label,
small {
  display: block;
}

label {
  margin-bottom: 0.45rem;
  color: var(--color-text-secondary);
}

small {
  margin-top: 0.4rem;
  color: var(--color-text-muted);
}

input {
  width: 100%;
  padding: 0.8rem;
  border: 1px solid var(--color-border-light);
  border-radius: 8px;
  color: var(--color-text-primary);
  background: var(--color-surface);
  font: inherit;
}

input:focus {
  border-color: var(--color-brand-secondary);
  outline: 2px solid var(--color-brand-soft);
}

.notice {
  padding: 0.8rem 1rem;
  margin-bottom: 1rem;
  border-radius: 8px;
  font-size: var(--font-size-body-sm);
}

.notice--success {
  color: var(--color-success);
  background: var(--color-success-soft);
}

.notice--error {
  color: var(--color-danger);
  background: rgba(220, 53, 69, 0.08);
}

.submit-button,
.resend-button {
  width: 100%;
  padding: 0.8rem;
  border-radius: 8px;
  font: inherit;
  cursor: pointer;
}

.submit-button {
  border: 1px solid var(--color-brand-secondary);
  color: white;
  background: var(--color-brand-secondary);
}

.resend-button {
  margin-top: 0.8rem;
  border: 0;
  color: var(--color-brand-secondary);
  background: transparent;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

@media (max-width: 480px) {
  .auth-card {
    padding: 1.4rem;
  }
}
</style>
