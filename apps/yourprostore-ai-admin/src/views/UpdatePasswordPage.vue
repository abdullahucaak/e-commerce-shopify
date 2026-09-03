<script setup>
import { computed, ref } from 'vue'
import { useAdminAuthStore } from '../stores/adminAuth.js'
import { validateAdminPassword } from '../services/passwordRecovery.js'

const auth = useAdminAuthStore()
const password = ref('')
const confirmation = ref('')
const code = ref('')
const loading = ref(false)
const completed = ref(false)
const error = ref('')
const hasRecoverySession = computed(() => auth.authenticated)
const requiresMfa = computed(() => hasRecoverySession.value && auth.requiresMfa)

async function verifyMfa() {
  loading.value = true
  error.value = ''
  try {
    await auth.verifyRecoveryTotp(code.value)
    code.value = ''
  } catch {
    error.value = 'Authenticator kodu doğrulanamadı. Güncel 6 haneli kodu tekrar deneyin.'
  } finally {
    loading.value = false
  }
}

async function submit() {
  error.value = ''
  const validationError = validateAdminPassword(password.value, confirmation.value)
  if (validationError === 'password_too_short') {
    error.value = 'Yeni şifre en az 8 karakter olmalıdır.'
    return
  }
  if (validationError === 'password_confirmation_mismatch') {
    error.value = 'Şifreler eşleşmiyor.'
    return
  }

  loading.value = true
  try {
    await auth.updateRecoveredPassword(password.value)
    password.value = ''
    confirmation.value = ''
    completed.value = true
  } catch (caught) {
    error.value = caught?.code === 'insufficient_aal'
      ? 'Şifre değişikliği için önce Authenticator kodunu doğrulayın.'
      : 'Şifre güncellenemedi. Bağlantı kullanılmış veya süresi dolmuş olabilir; yeni bağlantı isteyin.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="centered-page">
    <section class="panel auth-panel">
      <div class="eyebrow">INTERNAL OPERATIONS</div>
      <h1>Yeni admin şifresi belirleyin</h1>
      <p v-if="completed" class="notice success">Şifreniz güncellendi. Admin girişinden devam edebilirsiniz.</p>
      <p v-else-if="!hasRecoverySession" class="notice">
        Geçerli bir şifre kurtarma oturumu bulunamadı. Bağlantı kullanılmış veya süresi dolmuş olabilir.
      </p>
      <p v-if="error" class="notice">{{ error }}</p>
      <form v-if="requiresMfa && !completed" @submit.prevent="verifyMfa">
        <p class="muted">Hesabınızda iki aşamalı doğrulama açık. Yeni şifreyi belirlemeden önce Authenticator uygulamanızdaki kodu doğrulayın.</p>
        <label>6 haneli Authenticator kodu<input v-model="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required></label>
        <button :disabled="loading">{{ loading ? 'Doğrulanıyor…' : 'Kodu doğrula' }}</button>
      </form>
      <form v-else-if="hasRecoverySession && !completed" @submit.prevent="submit">
        <label>Yeni şifre<input v-model="password" type="password" autocomplete="new-password" minlength="8" required></label>
        <label>Yeni şifreyi doğrulayın<input v-model="confirmation" type="password" autocomplete="new-password" minlength="8" required></label>
        <p class="muted">En az 8 karakter kullanın.</p>
        <button :disabled="loading">{{ loading ? 'Güncelleniyor…' : 'Şifreyi güncelle' }}</button>
      </form>
      <RouterLink v-if="completed" class="button-link" to="/login">Admin girişine git</RouterLink>
      <RouterLink v-else-if="!hasRecoverySession" class="button-link" to="/forgot-password">Yeni bağlantı iste</RouterLink>
      <RouterLink class="text-link centered-link" to="/login">Admin girişine dön</RouterLink>
    </section>
  </main>
</template>
