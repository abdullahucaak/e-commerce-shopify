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
const success = ref(route.query.confirmed === '1' ? 'E-posta adresin doğrulandı. Şimdi giriş yapabilirsin.' : '')
const title = computed(() => mode.value === 'register' ? 'Mağazanı kurmaya başla' : 'Hesabına giriş yap')

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
      success.value = 'Hesabın oluşturuldu. E-postandaki doğrulama bağlantısına tıkla.'
      return
    }
    await account.signIn(email.value.trim(), password.value)
    await router.replace('/stores')
  } catch (caught) {
    const message = caught?.message?.toLowerCase() || ''
    error.value = message.includes('already registered')
      ? 'Bu e-posta adresiyle zaten bir hesap var.'
      : mode.value === 'register'
        ? 'Hesap oluşturulamadı. Bilgilerini kontrol edip tekrar dene.'
        : 'E-posta adresi veya şifre hatalı.'
  }
}
</script>

<template>
  <main class="auth-page">
    <form class="auth-card" @submit.prevent="submit">
      <RouterLink class="auth-brand" to="/">YourProStore</RouterLink>
      <div class="auth-tabs">
        <button type="button" :class="{ active: mode === 'login' }" @click="setMode('login')">Giriş yap</button>
        <button type="button" :class="{ active: mode === 'register' }" @click="setMode('register')">Hesap oluştur</button>
      </div>
      <h1>{{ title }}</h1>
      <p class="muted">{{ mode === 'register' ? 'Önce hesabını oluştur; ardından Shopify mağazanı birlikte bağlayalım.' : 'Mağazalarını kurmak ve aboneliklerini yönetmek için devam et.' }}</p>
      <p v-if="error" class="notice error">{{ error }}</p>
      <p v-if="success" class="notice success">{{ success }}</p>
      <label v-if="mode === 'register'">İşletme veya marka adı<input v-model="businessName" type="text" maxlength="120" required></label>
      <label>E-posta adresi<input v-model="email" type="email" required></label>
      <label>Şifre<input v-model="password" type="password" minlength="8" required></label>
      <small v-if="mode === 'register'" class="muted">En az 8 karakter kullan.</small>
      <button>{{ mode === 'register' ? 'Hesabımı oluştur ve devam et' : 'Giriş yap' }}</button>
    </form>
  </main>
</template>
