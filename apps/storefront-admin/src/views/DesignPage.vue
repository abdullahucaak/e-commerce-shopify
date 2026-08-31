<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { getSupabaseClient } from '../services/supabase'
import { optimizeRasterImage, removeStorefrontAsset, uploadStorefrontAsset } from '../services/storefrontAssets'

const authStore = useAuthStore()
const canEditDesign = computed(() => authStore.canEditDesign)
const stores = computed(() => (authStore.workspace?.stores || []).filter(store => store.storefront))
const selectedStoreId = computed({
  get: () => authStore.selectedStoreId || stores.value[0]?.id || '',
  set: value => { authStore.selectedStoreId = value }
})
const loading = ref(false)
const saving = ref(false)
const uploadingLogo = ref(false)
const message = ref('')
const error = ref('')
const savedLogoUrl = ref('')
const form = reactive({
  name: '',
  logoUrl: '',
  logoSize: 180,
  primary: '#303841',
  secondary: '#007dcc',
  announcementEnabled: true,
  announcementText: "Until October 20th, enjoy a 10% discount on every product with the code '1A18NM'!"
})
const selectedStore = computed(() => stores.value.find(store => store.id === selectedStoreId.value))
const previewFrame = ref(null)
const storefrontUrl = (import.meta.env.VITE_STOREFRONT_PREVIEW_URL || 'http://127.0.0.1:5173/').trim()
const previewHostname = ref('')
const previewPage = ref('/')
const previewPages = [
  { label: 'Ana sayfa', path: '/' },
  { label: 'Shop', path: '/shop' },
  { label: 'About Us', path: '/about-us' }
]
const previewUrl = computed(() => {
  if (!previewHostname.value) return ''
  const url = new URL(storefrontUrl)
  url.pathname = previewPage.value
  url.searchParams.set('preview', 'design')
  url.searchParams.set('previewHost', previewHostname.value)
  return url.toString()
})
const liveStorefrontUrl = ref('')

const draftSettings = computed(() => ({
  brand: {
    name: form.name,
    logo: { url: form.logoUrl, size: Number(form.logoSize), alt: form.name },
    colors: { primary: form.primary, secondary: form.secondary }
  },
  announcement: { enabled: form.announcementEnabled, text: form.announcementText }
}))

function sendPreview() {
  previewFrame.value?.contentWindow?.postMessage({
    type: 'glowfield:storefront-preview',
    settings: draftSettings.value
  }, new URL(storefrontUrl).origin)
}

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
    savedLogoUrl.value = form.logoUrl
    form.logoSize = brand.logo?.size || 180
    form.primary = brand.colors?.primary || '#303841'
    form.secondary = brand.colors?.secondary || '#007dcc'
    form.announcementEnabled = payload.settings?.announcement?.enabled !== false
    form.announcementText = payload.settings?.announcement?.text || "Until October 20th, enjoy a 10% discount on every product with the code '1A18NM'!"
  } catch {
    error.value = 'Tasarım ayarları yüklenemedi.'
  } finally {
    loading.value = false
  }
}

async function loadPreviewDomain() {
  const storefrontId = selectedStore.value?.storefront?.id
  previewHostname.value = ''
  liveStorefrontUrl.value = ''
  if (!storefrontId) return
  try {
    const response = await request(`/api/storefronts/${storefrontId}/domains`)
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error)
    const activeDomains = (payload.domains || []).filter(domain => domain.status === 'active')
    const previewDomain = activeDomains.find(domain => domain.isPrimary)
      || activeDomains.find(domain => domain.kind === 'custom')
      || activeDomains[0]
    const publicDomain = activeDomains.find(domain => domain.isPrimary && domain.kind === 'custom')
      || activeDomains.find(domain => domain.kind === 'custom')
    previewHostname.value = previewDomain?.hostname || ''
    liveStorefrontUrl.value = publicDomain
      ? `https://${publicDomain.hostname}`
      : previewUrl.value
  } catch {
    previewHostname.value = ''
  }
}

async function loadSelectedStore() {
  await Promise.all([loadDesign(), loadPreviewDomain()])
}

async function saveDesign() {
  if (!canEditDesign.value) return
  saving.value = true
  error.value = ''
  message.value = ''
  try {
    const response = await request(`/api/storefronts/${selectedStore.value.storefront.id}/design`, {
      method: 'PUT',
      body: JSON.stringify({
        name: form.name,
        logoUrl: form.logoUrl,
        logoSize: Number(form.logoSize),
        colors: { primary: form.primary, secondary: form.secondary },
        announcement: {
          enabled: form.announcementEnabled,
          text: form.announcementText
        }
      })
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error)
    const previousLogoUrl = savedLogoUrl.value
    savedLogoUrl.value = form.logoUrl
    if (previousLogoUrl && previousLogoUrl !== form.logoUrl) {
      await removeStorefrontAsset(getSupabaseClient(), previousLogoUrl).catch(() => {})
    }
    message.value = `Tasarım ayarları kaydedildi (sürüm ${payload.version}).`
  } catch {
    error.value = 'Ayarlar kaydedilemedi. Alanları kontrol et.'
  } finally {
    saving.value = false
  }
}

async function removeLogo() {
  if (!canEditDesign.value) return
  error.value = ''
  message.value = ''
  form.logoUrl = ''
  message.value = 'Logo kaldırılacak. Vitrine uygulamak için değişiklikleri kaydet.'
}

async function uploadLogo(event) {
  if (!canEditDesign.value) return
  const file = event.target.files?.[0]
  if (!file) return
  error.value = ''
  message.value = ''
  if (file.size > 2 * 1024 * 1024) {
    error.value = 'Logo en fazla 2 MB olabilir.'
    return
  }
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type)) {
    error.value = 'PNG, JPG, WEBP veya SVG logo seç.'
    return
  }

  uploadingLogo.value = true
  try {
    const client = getSupabaseClient()
    const optimizedFile = await optimizeRasterImage(file, { maxWidth: 1200, maxHeight: 600, quality: 0.88 })
    const previousDraftUrl = form.logoUrl
    form.logoUrl = await uploadStorefrontAsset(client, {
      storefrontId: selectedStore.value.storefront.id,
      folder: 'logos',
      file: optimizedFile
    })
    if (previousDraftUrl && previousDraftUrl !== savedLogoUrl.value) {
      await removeStorefrontAsset(client, previousDraftUrl).catch(() => {})
    }
    message.value = 'Logo seçildi. Vitrine uygulamak için değişiklikleri kaydet.'
  } catch {
    error.value = 'Logo yüklenemedi. Lütfen tekrar dene.'
  } finally {
    uploadingLogo.value = false
  }
}

watch(selectedStoreId, loadSelectedStore)
watch(draftSettings, sendPreview, { deep: true })
onMounted(loadSelectedStore)
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
      </nav>
    </aside>
    <main>
      <header>
        <div><p class="eyebrow">Mağaza vitrini</p><h1>Tasarım ayarları</h1></div>
        <div class="header-actions">
          <a v-if="liveStorefrontUrl" class="storefront-link" :href="liveStorefrontUrl" target="_blank" rel="noopener">Mağazayı görüntüle</a>
          <select v-model="selectedStoreId" aria-label="Mağaza seç">
            <option v-for="store in stores" :key="store.id" :value="store.id">{{ store.name }}</option>
          </select>
        </div>
      </header>

      <form v-if="selectedStore" class="editor" @submit.prevent="saveDesign">
        <fieldset class="settings-panel" :disabled="!canEditDesign">
          <h2>Marka</h2>
          <p v-if="!canEditDesign" class="permission-notice">
            Rolün tasarım ayarlarını görüntülemeye izin veriyor; değiştirme yetkisi owner veya admin rolündedir.
          </p>
          <label>Mağaza adı<input v-model.trim="form.name" maxlength="120" required></label>
          <label class="logo-upload">
            Logo dosyası <small>PNG, JPG, WEBP veya SVG · en fazla 2 MB</small>
            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" :disabled="uploadingLogo" @change="uploadLogo">
          </label>
          <p v-if="uploadingLogo" class="uploading">Logo yükleniyor…</p>
          <label class="logo-size">Logo boyutu: {{ form.logoSize }} px<input v-model="form.logoSize" type="range" min="80" max="320" step="10"></label>
          <button v-if="form.logoUrl" class="remove-logo" type="button" :disabled="uploadingLogo" @click="removeLogo">Logoyu kaldır</button>
          <div class="colors">
            <label>Ana renk<input v-model="form.primary" type="color"></label>
            <label>İkincil renk<input v-model="form.secondary" type="color"></label>
          </div>
          <div class="announcement-settings">
            <h2>Duyuru bandı</h2>
            <label class="toggle-label"><input v-model="form.announcementEnabled" type="checkbox"> Duyuru bandını göster</label>
            <label>Duyuru metni<textarea v-model.trim="form.announcementText" maxlength="240" rows="3" :required="form.announcementEnabled"></textarea></label>
            <small>{{ form.announcementText.length }}/240 karakter</small>
          </div>
          <p v-if="message" class="success">{{ message }}</p>
          <p v-if="error" class="error">{{ error }}</p>
          <button :disabled="saving || loading || !canEditDesign">
            {{ canEditDesign ? (saving ? 'Kaydediliyor…' : 'Değişiklikleri kaydet') : 'Salt okunur' }}
          </button>
        </fieldset>
        <section class="preview storefront-preview">
          <div class="preview-title">
            <div><p>Gerçek mağaza önizlemesi</p><small>Değişiklikler kaydetmeden burada görünür.</small></div>
            <label class="preview-page-select">Gösterilen sayfa
              <select v-model="previewPage">
                <option v-for="page in previewPages" :key="page.path" :value="page.path">{{ page.label }}</option>
              </select>
            </label>
          </div>
          <iframe v-if="previewUrl" ref="previewFrame" :src="previewUrl" title="Mağaza tasarım önizlemesi" @load="sendPreview"></iframe>
          <p v-else class="preview-unavailable">Bu mağazanın önizlemesi için önce Domain ayarları bölümünden Shopify domainlerini güncelle.</p>
        </section>
      </form>
      <p v-else>Önce bir Shopify mağazası bağlamalısın.</p>
    </main>
  </div>
</template>

<style scoped>
.page-shell{display:grid;grid-template-columns:250px 1fr;min-height:100vh;background:#f5f7f9}aside{display:flex;flex-direction:column;gap:3rem;padding:2rem 1.5rem;color:#fff;background:#202934}.wordmark{margin:0;font-size:1.55rem;font-weight:750}aside small{color:#ffffff94;text-transform:uppercase;letter-spacing:.1em}nav{display:grid;gap:.5rem}nav a{padding:.8rem .9rem;border-radius:9px;color:#fff;text-decoration:none}.router-link-active{background:#ffffff1f}main{padding:2.5rem}header{display:flex;justify-content:space-between;align-items:center}.eyebrow{margin:0;color:#6a7683;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em}h1,h2{margin:.35rem 0;color:#202934}select,input,button{padding:.75rem;border:1px solid #d8dee4;border-radius:8px;background:#fff}.editor{display:grid;grid-template-columns:minmax(320px,1fr) minmax(320px,1fr);gap:1rem;margin-top:2rem}.editor>section,.editor>fieldset{padding:1.5rem;border:1px solid #e2e7eb;border-radius:14px;background:#fff}.settings-panel{min-width:0;margin:0}.settings-panel:disabled{color:inherit}.settings-panel:disabled input,.settings-panel:disabled textarea,.settings-panel:disabled button{cursor:not-allowed;opacity:.65}label{display:grid;gap:.45rem;margin:1rem 0;color:#576470;font-size:.86rem}.logo-size input{padding:0}.remove-logo{margin-bottom:1rem;color:#b42318;border-color:#f0c7c3;background:#fff}.colors{display:grid;grid-template-columns:1fr 1fr;gap:1rem}.colors input{width:100%;height:48px;padding:.25rem}button{color:#fff;background:#303841;cursor:pointer}.success{color:#18794e}.error{color:#b42318}.permission-notice{padding:.75rem 1rem;border-radius:8px;color:#7a2e0e;background:#fff4e5}.preview{background:linear-gradient(145deg,color-mix(in srgb,var(--primary) 12%,white),white)!important}.preview-header{display:flex;align-items:center;height:340px;padding:1rem;border-bottom:4px solid var(--primary);overflow:hidden}.preview-header img{display:block;max-width:100%;max-height:320px;object-fit:contain;object-position:left center}.preview-card{display:flex;justify-content:space-between;align-items:center;margin-top:2rem;padding:1.25rem;border:1px solid #e2e7eb;border-radius:12px}.preview-card button{background:var(--secondary)}@media(max-width:760px){.page-shell{grid-template-columns:1fr}aside{padding:1rem;gap:1rem}.editor{grid-template-columns:1fr}main{padding:1.25rem}}
.announcement-settings{margin-top:1.5rem;padding-top:1rem;border-top:1px solid #e2e7eb}.announcement-settings textarea{padding:.75rem;border:1px solid #d8dee4;border-radius:8px;resize:vertical}.announcement-settings small{color:#6a7683}.toggle-label{display:flex;align-items:center;gap:.6rem}.toggle-label input{width:18px;height:18px;padding:0}.preview-announcement{margin:1rem 0 0;padding:.75rem;color:#fff;text-align:center;background:var(--primary)}
.wordmark{margin:0;font-size:1.55rem;font-weight:750;letter-spacing:-.04em}
.wordmark-subtitle{margin:.25rem 0 0;color:#ffffff94;font-size:.68rem;letter-spacing:.12em;text-transform:uppercase}
.header-actions{display:flex;align-items:center;gap:.75rem}.storefront-link{padding:.75rem 1rem;border-radius:8px;color:#fff;background:#303841;text-decoration:none}.storefront-preview{padding:0!important;overflow:hidden}.preview-title{display:flex;justify-content:space-between;align-items:center;padding:1rem 1.25rem}.preview-title p{margin:0}.preview-title small{color:#6a7683}.storefront-preview iframe{display:block;width:100%;height:720px;border:0;border-top:1px solid #e2e7eb;background:#fff}
.preview-unavailable{margin:0;padding:3rem 1.5rem;border-top:1px solid #e2e7eb;color:#6a7683;text-align:center}
.preview-page-select{display:flex;align-items:center;gap:.6rem;margin:0;font-size:.78rem}.preview-page-select select{padding:.55rem .7rem}
</style>
