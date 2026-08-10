<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useAuthStore } from '../stores/authStore'

const authStore = useAuthStore()
const stores = computed(() => (authStore.workspace?.stores || []).filter(store => store.storefront))
const selectedStoreId = ref(stores.value[0]?.id || '')
const loading = ref(false)
const saving = ref(false)
const message = ref('')
const error = ref('')
const form = reactive({ name: '', logoUrl: '', primary: '#303841', secondary: '#007dcc' })
const selectedStore = computed(() => stores.value.find(store => store.id === selectedStoreId.value))

async function request(path, options = {}) {
  return fetch(path, {
    ...options,
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${authStore.session.access_token}`,
      ...options.headers
    }
  })
}

async function loadDesign() {
  const storefrontId = selectedStore.value?.storefront?.id
  if (!storefrontId) return
  loading.value = true
  error.value = ''
  message.value = ''
  try {
    const response = await request(`/api/storefronts/${storefrontId}/design`)
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error)
    const brand = payload.settings?.brand || {}
    form.name = brand.name || selectedStore.value.name || ''
    form.logoUrl = brand.logo?.url || brand.logoUrl || ''
    form.primary = brand.colors?.primary || '#303841'
    form.secondary = brand.colors?.secondary || '#007dcc'
  } catch {
    error.value = 'Tasarım ayarları yüklenemedi.'
  } finally {
    loading.value = false
  }
}

async function saveDesign() {
  saving.value = true
  error.value = ''
  message.value = ''
  try {
    const response = await request(`/api/storefronts/${selectedStore.value.storefront.id}/design`, {
      method: 'PUT',
      body: JSON.stringify({
        name: form.name,
        logoUrl: form.logoUrl,
        colors: { primary: form.primary, secondary: form.secondary }
      })
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error)
    message.value = `Tasarım ayarları kaydedildi (sürüm ${payload.version}).`
  } catch {
    error.value = 'Ayarlar kaydedilemedi. Alanları kontrol et.'
  } finally {
    saving.value = false
  }
}

watch(selectedStoreId, loadDesign)
onMounted(loadDesign)
</script>

<template>
  <div class="page-shell">
    <aside>
      <div><p class="wordmark">GlowField</p><small>commerce platform</small></div>
      <nav>
        <RouterLink to="/dashboard">Genel bakış</RouterLink>
        <RouterLink to="/design">Tasarım ayarları</RouterLink>
      </nav>
    </aside>
    <main>
      <header>
        <div><p class="eyebrow">Mağaza vitrini</p><h1>Tasarım ayarları</h1></div>
        <select v-model="selectedStoreId" aria-label="Mağaza seç">
          <option v-for="store in stores" :key="store.id" :value="store.id">{{ store.name }}</option>
        </select>
      </header>

      <form v-if="selectedStore" class="editor" @submit.prevent="saveDesign">
        <section>
          <h2>Marka</h2>
          <label>Mağaza adı<input v-model.trim="form.name" maxlength="120" required></label>
          <label>Logo URL <small>(şimdilik HTTPS görsel adresi)</small><input v-model.trim="form.logoUrl" type="url" placeholder="https://..."></label>
          <div class="colors">
            <label>Ana renk<input v-model="form.primary" type="color"></label>
            <label>İkincil renk<input v-model="form.secondary" type="color"></label>
          </div>
          <p v-if="message" class="success">{{ message }}</p>
          <p v-if="error" class="error">{{ error }}</p>
          <button :disabled="saving || loading">{{ saving ? 'Kaydediliyor…' : 'Değişiklikleri kaydet' }}</button>
        </section>
        <section class="preview" :style="{ '--primary': form.primary, '--secondary': form.secondary }">
          <p>Canlı önizleme</p>
          <div class="preview-header">
            <img v-if="form.logoUrl" :src="form.logoUrl" alt="Logo önizlemesi">
            <strong v-else>{{ form.name || 'Marka adı' }}</strong>
          </div>
          <div class="preview-card"><span>Örnek ürün</span><button type="button">Sepete ekle</button></div>
        </section>
      </form>
      <p v-else>Önce bir Shopify mağazası bağlamalısın.</p>
    </main>
  </div>
</template>

<style scoped>
.page-shell{display:grid;grid-template-columns:250px 1fr;min-height:100vh;background:#f5f7f9}aside{display:flex;flex-direction:column;gap:3rem;padding:2rem 1.5rem;color:#fff;background:#202934}.wordmark{margin:0;font-size:1.55rem;font-weight:750}aside small{color:#ffffff94;text-transform:uppercase;letter-spacing:.1em}nav{display:grid;gap:.5rem}nav a{padding:.8rem .9rem;border-radius:9px;color:#fff;text-decoration:none}.router-link-active{background:#ffffff1f}main{padding:2.5rem}header{display:flex;justify-content:space-between;align-items:center}.eyebrow{margin:0;color:#6a7683;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em}h1,h2{margin:.35rem 0;color:#202934}select,input,button{padding:.75rem;border:1px solid #d8dee4;border-radius:8px;background:#fff}.editor{display:grid;grid-template-columns:minmax(320px,1fr) minmax(320px,1fr);gap:1rem;margin-top:2rem}.editor>section{padding:1.5rem;border:1px solid #e2e7eb;border-radius:14px;background:#fff}label{display:grid;gap:.45rem;margin:1rem 0;color:#576470;font-size:.86rem}.colors{display:grid;grid-template-columns:1fr 1fr;gap:1rem}.colors input{width:100%;height:48px;padding:.25rem}button{color:#fff;background:#303841;cursor:pointer}.success{color:#18794e}.error{color:#b42318}.preview{background:linear-gradient(145deg,color-mix(in srgb,var(--primary) 12%,white),white)!important}.preview-header{display:flex;align-items:center;height:110px;padding:1rem;border-bottom:4px solid var(--primary)}.preview-header img{max-width:180px;max-height:70px}.preview-card{display:flex;justify-content:space-between;align-items:center;margin-top:2rem;padding:1.25rem;border:1px solid #e2e7eb;border-radius:12px}.preview-card button{background:var(--secondary)}@media(max-width:760px){.page-shell{grid-template-columns:1fr}aside{padding:1rem;gap:1rem}.editor{grid-template-columns:1fr}main{padding:1.25rem}}
</style>
