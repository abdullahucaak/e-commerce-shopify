<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const router = useRouter()
const authStore = useAuthStore()
const signingOut = ref(false)

const stores = computed(() => authStore.workspace?.stores || [])
async function signOut() {
  signingOut.value = true

  try {
    await authStore.signOut()
    await router.replace('/login')
  } finally {
    signingOut.value = false
  }
}
</script>

<template>
  <div class="platform-shell">
    <aside class="sidebar">
      <div>
        <p class="wordmark">GlowField</p>
        <p class="wordmark-subtitle">commerce platform</p>
      </div>

      <nav aria-label="Platform menüsü">
        <RouterLink to="/dashboard" class="nav-link">Genel bakış</RouterLink>
        <RouterLink to="/design" class="nav-link">Tasarım ayarları</RouterLink>
        <RouterLink to="/content" class="nav-link">İçerik ayarları</RouterLink>
        <RouterLink to="/domains" class="nav-link">Domain ayarları</RouterLink>
      </nav>

      <button class="sign-out" type="button" :disabled="signingOut" @click="signOut">
        {{ signingOut ? 'Çıkış yapılıyor…' : 'Çıkış yap' }}
      </button>
    </aside>

    <main class="dashboard">
      <header class="dashboard-header">
        <div>
          <p class="eyebrow">Çalışma alanı</p>
          <h1>{{ authStore.workspace?.name || 'Mağaza yönetimi' }}</h1>
        </div>
        <div class="account">
          <strong>{{ authStore.membershipRole === 'owner' ? 'Sahip' : authStore.membershipRole }}</strong>
          <span>{{ authStore.user?.email }}</span>
        </div>
      </header>

      <section class="summary-grid" aria-label="Hesap özeti">
        <article class="summary-card">
          <span>Bağlı mağaza</span>
          <strong>{{ stores.length }}</strong>
        </article>
        <article class="summary-card">
          <span>Vitrin uygulaması</span>
          <strong>Vue storefront</strong>
        </article>
        <article class="summary-card">
          <span>Ürün kaynağı</span>
          <strong>Shopify</strong>
        </article>
      </section>

      <section class="stores-panel">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Shopify bağlantıları</p>
            <h2>Mağazalarım</h2>
          </div>
        </div>

        <div v-if="stores.length" class="store-list">
          <article v-for="store in stores" :key="store.id" class="store-card">
            <div class="store-avatar">{{ store.name?.slice(0, 1)?.toUpperCase() || 'S' }}</div>
            <div class="store-details">
              <div class="store-title">
                <h3>{{ store.name }}</h3>
                <span class="status">{{ store.status === 'active' ? 'Bağlı' : store.status }}</span>
              </div>
              <p>{{ store.myshopifyDomain }}</p>
              <small>
                Vitrin: {{ store.storefront?.status === 'active' ? 'aktif' : 'hazırlanıyor' }}
              </small>
            </div>
          </article>
        </div>

        <div v-else class="empty-state">
          <h3>Henüz bağlı Shopify mağazası yok</h3>
          <p>Shopify’a giriş yaparak mevcut mağazanı seçebilir veya yeni bir mağaza oluşturabilirsin.</p>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.platform-shell {
  display: grid;
  grid-template-columns: 250px 1fr;
  min-height: 100vh;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 3rem;
  padding: 2rem 1.5rem;
  color: white;
  background: #202934;
}

.wordmark {
  margin: 0;
  font-size: 1.55rem;
  font-weight: 750;
  letter-spacing: -0.04em;
}

.wordmark-subtitle {
  margin: 0.25rem 0 0;
  color: rgba(255, 255, 255, 0.58);
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

nav {
  display: grid;
  gap: 0.5rem;
}

.nav-link {
  display: flex;
  justify-content: space-between;
  padding: 0.8rem 0.9rem;
  border-radius: 9px;
  color: white;
  text-decoration: none;
}

.nav-link.router-link-active {
  background: rgba(255, 255, 255, 0.12);
}

.nav-link--disabled {
  color: rgba(255, 255, 255, 0.44);
}

.nav-link small {
  font-size: 0.64rem;
}

.sign-out {
  margin-top: auto;
  padding: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 9px;
  color: white;
  background: transparent;
  cursor: pointer;
}

.dashboard {
  padding: 2.5rem;
  background: #f5f7f9;
}

.dashboard-header,
.section-heading,
.store-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.eyebrow {
  margin: 0 0 0.35rem;
  color: #6a7683;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

h1,
h2,
h3 {
  margin: 0;
  color: #202934;
}

h1 {
  font-size: clamp(1.65rem, 3vw, 2.25rem);
}

.account {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  color: #6a7683;
  font-size: 0.85rem;
}

.account strong {
  color: #202934;
  text-transform: capitalize;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  margin: 2rem 0;
}

.summary-card,
.stores-panel {
  border: 1px solid #e2e7eb;
  border-radius: 14px;
  background: white;
  box-shadow: 0 10px 30px rgba(32, 41, 52, 0.04);
}

.summary-card {
  display: grid;
  gap: 0.55rem;
  padding: 1.25rem;
}

.summary-card span {
  color: #6a7683;
  font-size: 0.8rem;
}

.summary-card strong {
  color: #202934;
  font-size: 1.15rem;
}

.stores-panel {
  padding: 1.5rem;
}

.section-heading button {
  padding: 0.7rem 0.9rem;
  border: 1px solid #d8dee4;
  border-radius: 8px;
  color: #8a949e;
  background: #f8f9fa;
}

.connect-form {
  display: flex;
  gap: 0.5rem;
}

.connect-form button {
  color: white;
  border-color: #303841;
  background: #303841;
  cursor: pointer;
}

.connect-form button:disabled {
  cursor: wait;
  opacity: 0.62;
}

.notice {
  padding: 0.8rem 1rem;
  margin: 1rem 0 0;
  border-radius: 9px;
  font-size: 0.88rem;
}

.notice--success {
  color: #18794e;
  background: #e7f6ee;
}

.notice--error {
  color: #b42318;
  background: #fdf0ef;
}

.store-list {
  display: grid;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.store-card {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid #e5e9ed;
  border-radius: 11px;
}

.store-avatar {
  display: grid;
  flex: 0 0 46px;
  height: 46px;
  place-items: center;
  border-radius: 12px;
  color: white;
  background: #303841;
  font-weight: 700;
}

.store-details {
  flex: 1;
}

.store-details p,
.store-details small {
  display: block;
  margin: 0.35rem 0 0;
  color: #6a7683;
}

.status {
  padding: 0.25rem 0.55rem;
  border-radius: 99px;
  color: #18794e;
  background: #e7f6ee;
  font-size: 0.7rem;
  font-weight: 700;
}

.empty-state {
  padding: 3rem 1rem;
  text-align: center;
}

.empty-state p {
  color: #6a7683;
}

@media (max-width: 760px) {
  .platform-shell {
    grid-template-columns: 1fr;
  }

  .sidebar {
    gap: 1rem;
    padding: 1rem;
  }

  .sidebar nav,
  .sign-out {
    display: none;
  }

  .dashboard {
    padding: 1.25rem;
  }

  .dashboard-header {
    align-items: flex-start;
  }

  .account {
    max-width: 48%;
    text-align: right;
    overflow-wrap: anywhere;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .section-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .connect-form {
    width: 100%;
    flex-direction: column;
  }

  .connect-form input {
    min-width: 0;
    width: 100%;
  }
}
</style>
