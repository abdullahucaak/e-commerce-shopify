<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAccountStore } from '../stores/account.js'

const account = useAccountStore()
const router = useRouter()
const route = useRoute()
const mode = ref(route.query.mode === 'register' ? 'register' : 'login')
const businessName = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const success = ref(route.query.confirmed === '1' ? 'Your email address is verified. You can now log in.' : '')
const title = computed(() => mode.value === 'register' ? 'Start building your store' : 'Log in to your account')

function setMode(nextMode) {
  mode.value = nextMode
  error.value = ''
  success.value = ''
}

async function submit() {
  error.value = ''
  success.value = ''
  try {
    if (mode.value === 'register') {
      const data = await account.signUp(businessName.value.trim(), email.value.trim(), password.value)
      if (data.session) return router.replace('/stores')
      password.value = ''
      success.value = 'Your account was created. Click the verification link in your email.'
      return
    }
    await account.signIn(email.value.trim(), password.value)
    await router.replace('/stores')
  } catch (caught) {
    const message = caught?.message?.toLowerCase() || ''
    error.value = message.includes('already registered')
      ? 'An account already exists with this email address.'
      : mode.value === 'register'
        ? 'We could not create your account. Check your details and try again.'
        : 'The email address or password is incorrect.'
  }
}
</script>

<template>
  <main class="auth-page">
    <form class="auth-card" @submit.prevent="submit">
      <RouterLink class="auth-brand" to="/">YourProStore</RouterLink>
      <div class="auth-tabs">
        <button type="button" :class="{ active: mode === 'login' }" @click="setMode('login')">Log in</button>
        <button type="button" :class="{ active: mode === 'register' }" @click="setMode('register')">Create account</button>
      </div>
      <h1>{{ title }}</h1>
      <p class="muted">{{ mode === 'register' ? 'Create your account first, then connect your Shopify store.' : 'Continue to set up your stores and manage subscriptions.' }}</p>
      <p v-if="error" class="notice error">{{ error }}</p>
      <p v-if="success" class="notice success">{{ success }}</p>
      <label v-if="mode === 'register'">Business or brand name<input v-model="businessName" type="text" maxlength="120" required></label>
      <label>Email address<input v-model="email" type="email" required></label>
      <label>Password<input v-model="password" type="password" minlength="8" required></label>
      <RouterLink v-if="mode === 'login'" class="text-link forgot-link" to="/forgot-password">Forgot password?</RouterLink>
      <small v-if="mode === 'register'" class="muted">Use at least 8 characters.</small>
      <button>{{ mode === 'register' ? 'Create my account and continue' : 'Log in' }}</button>
    </form>
  </main>
</template>

<style scoped>
.forgot-link{justify-self:end;margin-top:-.5rem;font-size:.88rem}
</style>
