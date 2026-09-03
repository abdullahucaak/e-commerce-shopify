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
    error.value = 'We could not send the reset email. Please try again shortly.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-card">
      <RouterLink class="auth-brand" to="/">YourProStore</RouterLink>
      <h1>Reset your password</h1>
      <p class="muted">Enter your account email address. We will send a secure link for setting a new password.</p>
      <p v-if="submitted" class="notice success">
        If an account matches this email address, a reset link has been sent. Check your inbox and spam folder.
      </p>
      <p v-if="error" class="notice error">{{ error }}</p>
      <form v-if="!submitted" class="recovery-form" @submit.prevent="submit">
        <label>Email address<input v-model.trim="email" type="email" autocomplete="email" required></label>
        <button :disabled="loading">{{ loading ? 'Sending…' : 'Send reset link' }}</button>
      </form>
      <RouterLink class="text-link centered" to="/login">Back to login</RouterLink>
    </section>
  </main>
</template>

<style scoped>
.recovery-form{display:grid;gap:1rem}.centered{text-align:center}button:disabled{cursor:not-allowed;opacity:.65}
</style>
