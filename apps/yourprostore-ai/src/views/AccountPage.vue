<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAccountStore } from '../stores/account.js'

const account = useAccountStore()
const router = useRouter()
const signingOut = ref(false)

async function signOut() {
  signingOut.value = true
  try {
    await account.signOut()
    await router.replace('/login')
  } finally {
    signingOut.value = false
  }
}
</script>

<template>
  <div class="shell">
    <aside><p class="brand">YourProStore</p><nav><RouterLink to="/stores">Mağazalarım</RouterLink><RouterLink to="/subscriptions">Abonelikler</RouterLink><RouterLink to="/account">Hesabım</RouterLink></nav></aside>
    <main>
      <header><div><p class="eyebrow">Müşteri hesabı</p><h1>Hesabım</h1></div></header>
      <section class="card account-details">
        <div><span>E-posta</span><strong>{{ account.user?.email || '—' }}</strong></div>
        <div><span>Çalışma alanı</span><strong>{{ account.workspace?.name || '—' }}</strong></div>
        <div><span>Yetki</span><strong>{{ account.workspace?.role || '—' }}</strong></div>
        <div><span>Bağlı mağaza</span><strong>{{ account.workspace?.stores?.length || 0 }}</strong></div>
        <button :disabled="signingOut" @click="signOut">{{ signingOut ? 'Çıkış yapılıyor…' : 'Çıkış yap' }}</button>
      </section>
    </main>
  </div>
</template>

<style scoped>
.account-details { display: grid; max-width: 720px; gap: 0; }
.account-details div { display: flex; justify-content: space-between; gap: 1rem; padding: 1rem 0; border-bottom: 1px solid #e5eaed; }
.account-details span { color: #6a7683; }
.account-details button { justify-self: start; margin-top: 1.5rem; }
</style>
