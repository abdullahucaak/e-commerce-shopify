<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '../stores/authStore'

const authStore = useAuthStore()
const canManageDomains = computed(() => authStore.canManageDomains)
const stores = computed(() => (authStore.workspace?.stores || []).filter(store => store.storefront))
const selectedStoreId = computed({
  get: () => authStore.selectedStoreId || stores.value[0]?.id || '',
  set: value => { authStore.selectedStoreId = value }
})
const selectedStore = computed(() => stores.value.find(store => store.id === selectedStoreId.value))
const domainInfo = ref(null)
const loading = ref(false)
const syncing = ref(false)
const message = ref('')
const error = ref('')

async function request(path, options = {}) {
  return fetch(path, {
    ...options,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${authStore.session.access_token}`,
      ...options.headers
    }
  })
}

async function loadDomains() {
  const storefrontId = selectedStore.value?.storefront?.id
  if (!storefrontId) return
  loading.value = true
  error.value = ''
  message.value = ''
  try {
    const response = await request(`/api/storefronts/${storefrontId}/domains`)
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error)
    domainInfo.value = payload
  } catch {
    error.value = 'Domain bilgileri yüklenemedi.'
  } finally {
    loading.value = false
  }
}

async function syncDomains() {
  if (!canManageDomains.value) return
  syncing.value = true
  error.value = ''
  message.value = ''
  try {
    const response = await request(
      `/api/storefronts/${selectedStore.value.storefront.id}/domains/sync`,
      { method: 'POST' }
    )
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error)
    domainInfo.value = payload
    message.value = 'Domain bilgileri Shopify’dan güncellendi.'
  } catch (syncError) {
    if (syncError.message === 'domain_already_claimed') {
      error.value = 'Bu domain başka bir vitrine bağlı.'
    } else if (syncError.message === 'shopify_reconnect_required') {
      error.value = 'Bu mağazanın eski bağlantısı yenilenmeli. Genel bakıştan Shopify mağazasını tekrar bağla.'
    } else {
      error.value = 'Domain Shopify’dan doğrulanamadı. Shopify Admin → Settings → Domains bölümünü kontrol et.'
    }
  } finally {
    syncing.value = false
  }
}

watch(selectedStoreId, loadDomains)
onMounted(loadDomains)
</script>

<template>
  <div class="page-shell">
    <aside>
      <div><p class="wordmark">YourProStore.ai</p><p class="wordmark-subtitle">storefront admin</p></div>
      <nav>
        <RouterLink to="/dashboard">Genel bakış</RouterLink>
        <RouterLink to="/design">Tasarım ayarları</RouterLink>
        <RouterLink to="/content">İçerik ayarları</RouterLink>
        <RouterLink to="/domains">Domain ayarları</RouterLink>
        <RouterLink to="/versions">Sürüm geçmişi</RouterLink>
      </nav>
    </aside>

    <main>
      <header>
        <div><p class="eyebrow">Mağaza bağlantısı</p><h1>Domain ayarları</h1></div>
        <select v-model="selectedStoreId" aria-label="Mağaza seç">
          <option v-for="store in stores" :key="store.id" :value="store.id">{{ store.name }}</option>
        </select>
      </header>

      <section v-if="selectedStore" class="domain-panel">
        <div class="intro">
          <div>
            <h2>Shopify domainleri</h2>
            <p>Domain satın alma ve DNS işlemlerini Shopify üzerinden yönetmeye devam edeceksin.</p>
          </div>
          <button :disabled="syncing || loading || !canManageDomains" @click="syncDomains">
            {{ canManageDomains ? (syncing ? 'Kontrol ediliyor…' : 'Shopify’dan güncelle') : 'Salt okunur' }}
          </button>
        </div>

        <p v-if="!canManageDomains" class="permission-notice">
          Rolün domainleri görüntülemeye izin veriyor; güncelleme yetkisi owner veya admin rolündedir.
        </p>

        <p v-if="message" class="success">{{ message }}</p>
        <p v-if="error" class="error">{{ error }}</p>

        <div v-if="domainInfo" class="domain-list">
          <article v-for="domain in domainInfo.domains" :key="domain.id">
            <div>
              <strong>{{ domain.hostname }}</strong>
              <small>{{ domain.kind === 'custom' ? 'Özel domain' : 'Shopify yedek adresi' }}</small>
            </div>
            <div class="badges">
              <span v-if="domain.isPrimary" class="primary">Birincil</span>
              <span :class="domain.status === 'active' ? 'active' : 'inactive'">
                {{ domain.status === 'active' ? 'Aktif' : domain.status }}
              </span>
            </div>
          </article>
          <div v-if="!domainInfo.domains.length" class="empty">
            Henüz eşleştirilmiş domain yok. Shopify’dan güncelle butonuna bas.
          </div>
        </div>
      </section>
      <p v-else>Önce bir Shopify mağazası bağlamalısın.</p>
    </main>
  </div>
</template>

<style scoped>
.page-shell{display:grid;grid-template-columns:250px 1fr;min-height:100vh;background:#f5f7f9}aside{display:flex;flex-direction:column;gap:3rem;padding:2rem 1.5rem;color:#fff;background:#202934}.wordmark{margin:0;font-size:1.55rem;font-weight:750}aside small{color:#ffffff94;text-transform:uppercase;letter-spacing:.1em}nav{display:grid;gap:.5rem}nav a{padding:.8rem .9rem;border-radius:9px;color:#fff;text-decoration:none}.router-link-active{background:#ffffff1f}main{padding:2.5rem}header,.intro,.domain-list article{display:flex;justify-content:space-between;align-items:center}.eyebrow{margin:0;color:#6a7683;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em}h1,h2{margin:.35rem 0;color:#202934}select,button{padding:.75rem;border:1px solid #d8dee4;border-radius:8px;background:#fff}.domain-panel{margin-top:2rem;padding:1.5rem;border:1px solid #e2e7eb;border-radius:14px;background:#fff}.intro p{margin:.4rem 0;color:#63707c}.intro button{color:#fff;background:#303841;cursor:pointer}.domain-list{display:grid;gap:.75rem;margin-top:1.5rem}.domain-list article{padding:1rem;border:1px solid #e2e7eb;border-radius:10px}.domain-list article div:first-child{display:grid;gap:.3rem}.domain-list article small{color:#6a7683}.badges{display:flex;gap:.5rem}.badges span{padding:.3rem .55rem;border-radius:999px;font-size:.72rem}.primary{color:#175cd3;background:#eff8ff}.active{color:#18794e;background:#ecfdf3}.inactive{color:#7a2e0e;background:#fff4e5}.success{color:#18794e}.error{color:#b42318}.empty{padding:1.5rem;text-align:center;color:#6a7683;background:#f7f9fa;border-radius:10px}@media(max-width:760px){.page-shell{grid-template-columns:1fr}aside{padding:1rem;gap:1rem}main{padding:1.25rem}.intro{align-items:flex-start;gap:1rem;flex-direction:column}.domain-list article{align-items:flex-start;gap:1rem;flex-direction:column}}
.wordmark{margin:0;font-size:1.55rem;font-weight:750;letter-spacing:-.04em}
.wordmark-subtitle{margin:.25rem 0 0;color:#ffffff94;font-size:.68rem;letter-spacing:.12em;text-transform:uppercase}
.permission-notice{padding:.75rem 1rem;border-radius:8px;color:#7a2e0e;background:#fff4e5}.intro button:disabled{cursor:not-allowed;opacity:.65}
</style>
