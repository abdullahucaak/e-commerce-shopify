<script setup>
import { computed, ref } from 'vue'
import { useAccountStore } from '../stores/account.js'
import { validateNewPassword } from '../services/passwordRecovery.js'

const account = useAccountStore()
const password = ref('')
const confirmation = ref('')
const loading = ref(false)
const completed = ref(false)
const error = ref('')
const hasRecoverySession = computed(() => account.authenticated)

async function submit() {
  error.value = ''
  const validationError = validateNewPassword(password.value, confirmation.value)
  if (validationError === 'password_too_short') {
    error.value = 'The new password must be at least 8 characters.'
    return
  }
  if (validationError === 'password_confirmation_mismatch') {
    error.value = 'The passwords do not match.'
    return
  }

  loading.value = true
  try {
    await account.updatePassword(password.value)
    password.value = ''
    confirmation.value = ''
    completed.value = true
  } catch {
    error.value = 'We could not update the password. The link may have expired; request a new reset link.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-card">
      <RouterLink class="auth-brand" to="/">YourProStore</RouterLink>
      <h1>Set a new password</h1>
      <p v-if="completed" class="notice success">Your password was updated. You can continue to your account.</p>
      <p v-else-if="!hasRecoverySession" class="notice error">
        No valid recovery session was found. The link may have been used or expired.
      </p>
      <p v-if="error" class="notice error">{{ error }}</p>

      <form v-if="hasRecoverySession && !completed" class="recovery-form" @submit.prevent="submit">
        <label>New password<input v-model="password" type="password" autocomplete="new-password" minlength="8" required></label>
        <label>Confirm new password<input v-model="confirmation" type="password" autocomplete="new-password" minlength="8" required></label>
        <small class="muted">Use at least 8 characters.</small>
        <button :disabled="loading">{{ loading ? 'Updating…' : 'Update password' }}</button>
      </form>

      <RouterLink v-if="completed" class="continue-link" to="/stores">Continue to my stores</RouterLink>
      <RouterLink v-else-if="!hasRecoverySession" class="continue-link" to="/forgot-password">Request a new link</RouterLink>
      <RouterLink class="text-link centered" to="/login">Back to login</RouterLink>
    </section>
  </main>
</template>

<style scoped>
.recovery-form{display:grid;gap:1rem}.centered{text-align:center}.continue-link{padding:.8rem 1rem;border-radius:9px;color:#fff;background:#303841;text-align:center;text-decoration:none}button:disabled{cursor:not-allowed;opacity:.65}
</style>
