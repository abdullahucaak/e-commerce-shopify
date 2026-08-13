<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { getSupabaseClient } from '../services/supabase'
import { optimizeRasterImage, removeStorefrontAsset, uploadStorefrontAsset } from '../services/storefrontAssets'

const authStore = useAuthStore()
const stores = computed(() => (authStore.workspace?.stores || []).filter(store => store.storefront))
const selectedStoreId = ref(stores.value[0]?.id || '')
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
  url.searchParams.set('preview', 'content')
  url.searchParams.set('previewHost', previewHostname.value)
  return url.toString()
})
const liveStorefrontUrl = ref('')
const loading = ref(false)
const saving = ref(false)
const uploading = ref(false)
const uploadingHero = ref(false)
const message = ref('')
const error = ref('')
const savedHeroImageUrl = ref('')
const savedAboutImageUrl = ref('')
const form = reactive({
  home: { heroTitle: '', heroSubtitle: '', statement: '', heroImageUrl: '' },
  shop: { description: '' },
  about: { title: '', imageUrl: '', imageAlt: '', body: '' },
  footer: { emails: ['', '', ''], social: { facebookUrl: '', instagramUrl: '' } }
})

function draftContentSettings() {
  return {
    content: {
      home: { ...form.home },
      shop: { ...form.shop },
      about: { ...form.about },
      footer: {
        emails: form.footer.emails.filter(Boolean),
        social: { ...form.footer.social }
      }
    }
  }
}

function sendPreview() {
  previewFrame.value?.contentWindow?.postMessage({
    type: 'glowfield:storefront-preview',
    settings: draftContentSettings()
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

function fillForm(settings) {
  Object.assign(form.home, {
    heroTitle: '',
    heroSubtitle: '',
    statement: '',
    heroImageUrl: '',
    ...(settings.home || {})
  })
  Object.assign(form.shop, settings.shop)
  Object.assign(form.about, settings.about, { imageUrl: settings.about.imageUrl || '' })
  form.footer.emails = [...(settings.footer.emails || []), '', '', ''].slice(0, 3)
  Object.assign(form.footer.social, settings.footer.social || {})
}

async function loadContent() {
  const storefrontId = selectedStore.value?.storefront?.id
  if (!storefrontId) return
  loading.value = true
  message.value = ''
  error.value = ''
  try {
    const response = await request(`/api/storefronts/${storefrontId}/content`)
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error)
    fillForm(payload.settings)
    savedHeroImageUrl.value = form.home.heroImageUrl
    savedAboutImageUrl.value = form.about.imageUrl
  } catch {
    error.value = 'İçerik ayarları yüklenemedi.'
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
  await Promise.all([loadContent(), loadPreviewDomain()])
}

async function uploadAboutImage(event) {
  const file = event.target.files?.[0]
  if (!file) return
  error.value = ''
  message.value = ''
  if (file.size > 5 * 1024 * 1024) {
    error.value = 'About Us görseli en fazla 5 MB olabilir.'
    return
  }
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    error.value = 'JPG, PNG veya WEBP görsel seç.'
    return
  }
  uploading.value = true
  try {
    const client = getSupabaseClient()
    const optimizedFile = await optimizeRasterImage(file, { maxWidth: 1800, maxHeight: 1800 })
    const previousDraftUrl = form.about.imageUrl
    form.about.imageUrl = await uploadStorefrontAsset(client, {
      storefrontId: selectedStore.value.storefront.id, folder: 'about', file: optimizedFile
    })
    if (previousDraftUrl && previousDraftUrl !== savedAboutImageUrl.value) {
      await removeStorefrontAsset(client, previousDraftUrl).catch(() => {})
    }
    message.value = 'Görsel seçildi. Vitrine uygulamak için içerikleri kaydet.'
  } catch {
    error.value = 'Görsel yüklenemedi.'
  } finally {
    uploading.value = false
  }
}

async function uploadHeroImage(event) {
  const file = event.target.files?.[0]
  if (!file) return
  error.value = ''
  message.value = ''
  if (file.size > 8 * 1024 * 1024) {
    error.value = 'Banner görseli en fazla 8 MB olabilir.'
    return
  }
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    error.value = 'Banner için JPG, PNG veya WEBP görsel seç.'
    return
  }
  uploadingHero.value = true
  try {
    const client = getSupabaseClient()
    const optimizedFile = await optimizeRasterImage(file, { maxWidth: 2560, maxHeight: 1440 })
    const previousDraftUrl = form.home.heroImageUrl
    form.home.heroImageUrl = await uploadStorefrontAsset(client, {
      storefrontId: selectedStore.value.storefront.id, folder: 'hero', file: optimizedFile
    })
    if (previousDraftUrl && previousDraftUrl !== savedHeroImageUrl.value) {
      await removeStorefrontAsset(client, previousDraftUrl).catch(() => {})
    }
    message.value = 'Banner görseli seçildi. Vitrine uygulamak için içerikleri kaydet.'
  } catch {
    error.value = 'Banner görseli yüklenemedi.'
  } finally {
    uploadingHero.value = false
  }
}

async function saveContent() {
  saving.value = true
  message.value = ''
  error.value = ''
  try {
    const response = await request(`/api/storefronts/${selectedStore.value.storefront.id}/content`, {
      method: 'PUT',
      body: JSON.stringify({
        home: form.home,
        shop: form.shop,
        about: form.about,
        footer: {
          emails: form.footer.emails.map(value => value.trim()).filter(Boolean),
          social: form.footer.social
        }
      })
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error)
    const previousHeroUrl = savedHeroImageUrl.value
    const previousAboutUrl = savedAboutImageUrl.value
    savedHeroImageUrl.value = form.home.heroImageUrl
    savedAboutImageUrl.value = form.about.imageUrl
    const client = getSupabaseClient()
    await Promise.all([
      previousHeroUrl && previousHeroUrl !== form.home.heroImageUrl
        ? removeStorefrontAsset(client, previousHeroUrl).catch(() => {}) : null,
      previousAboutUrl && previousAboutUrl !== form.about.imageUrl
        ? removeStorefrontAsset(client, previousAboutUrl).catch(() => {}) : null
    ])
    message.value = `İçerikler kaydedildi (sürüm ${payload.version}).`
  } catch {
    error.value = 'İçerikler kaydedilemedi. Alanları ve bağlantıları kontrol et.'
  } finally {
    saving.value = false
  }
}

watch(selectedStoreId, loadSelectedStore)
watch(form, sendPreview, { deep: true })
onMounted(loadSelectedStore)
</script>

<template>
  <div class="page-shell">
    <aside>
      <div><p class="wordmark">GlowField</p><p class="wordmark-subtitle">commerce platform</p></div>
      <nav>
        <RouterLink to="/dashboard">Genel bakış</RouterLink>
        <RouterLink to="/design">Tasarım ayarları</RouterLink>
        <RouterLink to="/content">İçerik ayarları</RouterLink>
        <RouterLink to="/domains">Domain ayarları</RouterLink>
      </nav>
    </aside>
    <main>
      <header>
        <div><p class="eyebrow">Mağaza vitrini</p><h1>İçerik ayarları</h1></div>
        <div class="header-actions">
          <a v-if="liveStorefrontUrl" class="storefront-link" :href="liveStorefrontUrl" target="_blank" rel="noopener">Mağazayı görüntüle</a>
          <select v-model="selectedStoreId" aria-label="Mağaza seç">
            <option v-for="store in stores" :key="store.id" :value="store.id">{{ store.name }}</option>
          </select>
        </div>
      </header>

      <form v-if="selectedStore" @submit.prevent="saveContent">
        <section class="storefront-preview">
          <div class="preview-title">
            <div><p>Gerçek mağaza önizlemesi</p><small>Değişiklikler kaydetmeden burada görünür.</small></div>
            <label class="preview-page-select">Gösterilen sayfa
              <select v-model="previewPage">
                <option v-for="page in previewPages" :key="page.path" :value="page.path">{{ page.label }}</option>
              </select>
            </label>
          </div>
          <iframe v-if="previewUrl" ref="previewFrame" :src="previewUrl" title="Mağaza içerik önizlemesi" @load="sendPreview"></iframe>
          <p v-else class="preview-unavailable">Bu mağazanın önizlemesi için önce Domain ayarları bölümünden Shopify domainlerini güncelle.</p>
        </section>
        <section>
          <h2>Ana sayfa</h2>
          <label>Banner başlığı <small>{{ form.home.heroTitle.length }}/32</small><input v-model.trim="form.home.heroTitle" maxlength="32" required></label>
          <label>Banner alt başlığı <small>{{ form.home.heroSubtitle.length }}/80</small><textarea v-model.trim="form.home.heroSubtitle" maxlength="80" rows="2" required></textarea></label>
          <label>Banner görseli <small>JPG, PNG veya WEBP · en fazla 8 MB</small><input type="file" accept="image/png,image/jpeg,image/webp" :disabled="uploadingHero" @change="uploadHeroImage"></label>
          <img v-if="form.home.heroImageUrl" class="hero-preview" :src="form.home.heroImageUrl" alt="Banner önizlemesi">
          <button v-if="form.home.heroImageUrl" class="remove-image" type="button" @click="form.home.heroImageUrl = ''">Banner görselini kaldır</button>
          <label>Tanıtım cümlesi <small>{{ form.home.statement.length }}/120</small><textarea v-model.trim="form.home.statement" maxlength="120" rows="3" required></textarea></label>
        </section>

        <section>
          <h2>Shop sayfası</h2>
          <label>Açıklama <small>{{ form.shop.description.length }}/450</small><textarea v-model.trim="form.shop.description" maxlength="450" rows="7" required></textarea></label>
        </section>

        <section>
          <h2>About Us</h2>
          <label>Başlık <small>{{ form.about.title.length }}/40</small><input v-model.trim="form.about.title" maxlength="40" required></label>
          <label>Görsel <small>JPG, PNG veya WEBP · en fazla 5 MB</small><input type="file" accept="image/png,image/jpeg,image/webp" :disabled="uploading" @change="uploadAboutImage"></label>
          <img v-if="form.about.imageUrl" class="image-preview" :src="form.about.imageUrl" :alt="form.about.imageAlt">
          <label>Görsel açıklaması<input v-model.trim="form.about.imageAlt" maxlength="120" required></label>
          <label>Metin <small>{{ form.about.body.length }}/4000</small><textarea v-model.trim="form.about.body" maxlength="4000" rows="16" required></textarea></label>
        </section>

        <section>
          <h2>Footer ve sosyal medya</h2>
          <p class="hint">En fazla üç iletişim e-postası girebilirsin.</p>
          <label v-for="(_, index) in form.footer.emails" :key="index">E-posta {{ index + 1 }}<input v-model.trim="form.footer.emails[index]" type="email" maxlength="254"></label>
          <label>Facebook profil adresi<input v-model.trim="form.footer.social.facebookUrl" type="url" placeholder="https://facebook.com/markan"></label>
          <label>Instagram profil adresi<input v-model.trim="form.footer.social.instagramUrl" type="url" placeholder="https://instagram.com/markan"></label>
        </section>

        <div class="save-bar">
          <p v-if="message" class="success">{{ message }}</p>
          <p v-if="error" class="error">{{ error }}</p>
          <button :disabled="saving || loading || uploading || uploadingHero">{{ saving ? 'Kaydediliyor…' : 'İçerikleri kaydet' }}</button>
        </div>
      </form>
      <p v-else>Önce bir Shopify mağazası bağlamalısın.</p>
    </main>
  </div>
</template>

<style scoped>
.page-shell{display:grid;grid-template-columns:250px 1fr;min-height:100vh;background:#f5f7f9}aside{display:flex;flex-direction:column;gap:3rem;padding:2rem 1.5rem;color:#fff;background:#202934}.wordmark{margin:0;font-size:1.55rem;font-weight:750}aside small{color:#ffffff94;text-transform:uppercase;letter-spacing:.1em}nav{display:grid;gap:.5rem}nav a{padding:.8rem .9rem;border-radius:9px;color:#fff;text-decoration:none}.router-link-active{background:#ffffff1f}main{padding:2.5rem}header{display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem}.eyebrow{margin:0;color:#6a7683;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em}h1,h2{margin:.35rem 0;color:#202934}form{display:grid;grid-template-columns:repeat(2,minmax(300px,1fr));gap:1rem}section{padding:1.5rem;border:1px solid #e2e7eb;border-radius:14px;background:#fff}label{display:grid;gap:.45rem;margin:1rem 0;color:#576470;font-size:.86rem}label small,.hint{color:#77838e}input,textarea,select,button{padding:.75rem;border:1px solid #d8dee4;border-radius:8px;background:#fff}textarea{resize:vertical}.image-preview{display:block;max-width:220px;max-height:280px;object-fit:contain;border-radius:8px}.hero-preview{display:block;width:100%;max-height:240px;object-fit:cover;border-radius:8px}.remove-image{width:max-content;color:#b42318;background:#fff;border-color:#f0b8b3;cursor:pointer}.save-bar{grid-column:1/-1;display:flex;align-items:center;justify-content:flex-end;gap:1rem;position:sticky;bottom:0;padding:1rem;background:#f5f7f9}.save-bar button{color:#fff;background:#303841;cursor:pointer}.success{color:#18794e}.error{color:#b42318}@media(max-width:800px){.page-shell{grid-template-columns:1fr}aside{padding:1rem;gap:1rem}main{padding:1.25rem}form{grid-template-columns:1fr}.save-bar{align-items:stretch;flex-direction:column}}
.wordmark{margin:0;font-size:1.55rem;font-weight:750;letter-spacing:-.04em}
.wordmark-subtitle{margin:.25rem 0 0;color:#ffffff94;font-size:.68rem;letter-spacing:.12em;text-transform:uppercase}
.header-actions{display:flex;align-items:center;gap:.75rem}.storefront-link{padding:.75rem 1rem;border-radius:8px;color:#fff;background:#303841;text-decoration:none}.storefront-preview{grid-column:1/-1;padding:0;overflow:hidden}.preview-title{display:flex;justify-content:space-between;align-items:center;padding:1rem 1.25rem}.preview-title p{margin:0}.preview-title small{color:#6a7683}.storefront-preview iframe{display:block;width:100%;height:720px;border:0;border-top:1px solid #e2e7eb;background:#fff}
.preview-unavailable{margin:0;padding:3rem 1.5rem;border-top:1px solid #e2e7eb;color:#6a7683;text-align:center}
.preview-page-select{display:flex;align-items:center;gap:.6rem;margin:0;font-size:.78rem}.preview-page-select select{padding:.55rem .7rem}
</style>
