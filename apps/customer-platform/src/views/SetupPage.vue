<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAccountStore } from '../stores/account.js'
import { supabase } from '../services/supabase.js'
import { optimizeLogo, uploadLogo } from '../services/storefrontAssets.js'

const SETUP_STEP_KEYS = ['shopify_connection', 'niche_selection', 'banner_selection', 'brand_setup', 'store_preview', 'domain_setup', 'publish']
const REQUIRED_SETUP_STEP_KEYS = SETUP_STEP_KEYS.filter(stepKey => stepKey !== 'publish')

const route = useRoute()
const account = useAccountStore()
const data = ref(null)
const nicheId = ref('')
const bannerPresetId = ref('')
const error = ref('')
const message = ref('')
const savingBrand = ref(false)
const uploadingLogo = ref(false)
const brandResult = ref(null)
const domainInfo = ref(null)
const checkingDomains = ref(false)
const domainChecked = ref(false)
const completingSetup = ref(false)
const brand = reactive({
  name: '', logoUrl: '', logoSize: 180, primary: '#303841', secondary: '#007dcc',
  announcementEnabled: true,
  announcementText: "Until October 20th, enjoy a 10% discount on every product with the code 'SAYHIGLOW'!"
})
const progress = computed(() => {
  const steps = (data.value?.steps || []).filter(step => SETUP_STEP_KEYS.includes(step.step_key))
  return Math.round(steps.filter(step => step.status === 'completed').length / SETUP_STEP_KEYS.length * 100)
})
const bannerPresets = computed(() => (data.value?.bannerPresets || []).filter(preset => preset.nicheId === nicheId.value))
const brandCompleted = computed(() => data.value?.steps?.some(step => step.step_key === 'brand_setup' && step.status === 'completed'))
const previewCompleted = computed(() => data.value?.steps?.some(step => step.step_key === 'store_preview' && step.status === 'completed'))
const domainCompleted = computed(() => data.value?.steps?.some(step => step.step_key === 'domain_setup' && step.status === 'completed'))
const publishCompleted = computed(() => data.value?.steps?.some(step => step.step_key === 'publish' && step.status === 'completed'))
const requiredSetupCompleted = computed(() => REQUIRED_SETUP_STEP_KEYS.every(stepKey =>
  data.value?.steps?.some(step => step.step_key === stepKey && step.status === 'completed')
))
const activeCustomDomain = computed(() => domainInfo.value?.domains?.find(domain => domain.kind === 'custom' && domain.status === 'active') || null)
const myshopifyDomain = computed(() => domainInfo.value?.myshopifyDomain || data.value?.storefront.myshopifyDomain || '')
const shopifyDomainsUrl = computed(() => {
  const handle = myshopifyDomain.value.replace(/\.myshopify\.com$/i, '')
  return handle ? `https://admin.shopify.com/store/${handle}/settings/domains` : 'https://admin.shopify.com/'
})
const storefrontPreviewUrl = computed(() => {
  const url = new URL(import.meta.env.VITE_STOREFRONT_PREVIEW_URL || 'http://127.0.0.1:5173/')
  if (data.value?.storefront.myshopifyDomain) url.searchParams.set('previewHost', data.value.storefront.myshopifyDomain)
  return url.toString()
})
const storeCmsUrl = computed(() => new URL('/design', import.meta.env.VITE_STORE_CMS_URL || 'http://127.0.0.1:5174/').toString())

async function request(path, options = {}) {
  const headers = {
    Authorization: `Bearer ${account.session.access_token}`,
    ...(options.body !== undefined ? { 'content-type': 'application/json' } : {}),
    ...(options.headers || {})
  }
  return fetch(path, { ...options, headers })
}
async function load() {
  const response = await request(`/api/storefronts/${route.params.storefrontId}/onboarding`)
  if (!response.ok) { error.value = 'Kurulum bilgileri yüklenemedi.'; return }
  data.value = await response.json()
  nicheId.value = data.value.storefront.nicheId || ''
  bannerPresetId.value = data.value.storefront.bannerPresetId || ''
  if (!brand.name) await loadBrand()
  if (previewCompleted.value && !domainChecked.value) {
    domainChecked.value = true
    await syncDomains(true)
  }
}
async function loadBrand() {
  const response = await request(`/api/storefronts/${route.params.storefrontId}/design`)
  if (!response.ok) return
  const payload = await response.json()
  const stored = payload.settings || {}
  brand.name = stored.brand?.name || data.value?.storefront.name || ''
  brand.logoUrl = stored.brand?.logo?.url || ''
  brand.logoSize = stored.brand?.logo?.size || 180
  brand.primary = stored.brand?.colors?.primary || '#303841'
  brand.secondary = stored.brand?.colors?.secondary || '#007dcc'
  brand.announcementEnabled = stored.announcement?.enabled !== false
  brand.announcementText = stored.announcement?.text || brand.announcementText
}
async function saveBanner() {
  error.value = ''; message.value = ''
  const response = await request(`/api/storefronts/${route.params.storefrontId}/onboarding/banner`, {
    method: 'PATCH', body: JSON.stringify({ bannerPresetId: bannerPresetId.value })
  })
  if (!response.ok) { error.value = 'Banner seçimi kaydedilemedi.'; return }
  await load(); message.value = 'Banner seçildi. Sıradaki adımda marka bilgilerini hazırlayacağız.'
}
async function save() {
  error.value = ''; message.value = ''
  const response = await request(`/api/storefronts/${route.params.storefrontId}/onboarding/niche`, { method: 'PATCH', body: JSON.stringify({ nicheId: nicheId.value }) })
  if (!response.ok) { error.value = 'Sektör kaydedilemedi.'; return }
  await load(); message.value = 'Sektör kaydedildi. Sıradaki adımda bannerını seçeceksin.'
}
async function chooseLogo(event) {
  const file = event.target.files?.[0]
  if (!file) return
  error.value = ''; message.value = ''
  if (file.size > 2 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type)) {
    error.value = 'PNG, JPG, WEBP veya SVG biçiminde, en fazla 2 MB logo seç.'
    return
  }
  uploadingLogo.value = true
  try {
    brand.logoUrl = await uploadLogo(supabase, route.params.storefrontId, await optimizeLogo(file))
    message.value = 'Logo yüklendi. Marka bilgilerini kaydettiğinde mağazana uygulanacak.'
  } catch { error.value = 'Logo yüklenemedi. Lütfen tekrar dene.' }
  finally { uploadingLogo.value = false; event.target.value = '' }
}
async function saveBrand() {
  error.value = ''; message.value = ''; savingBrand.value = true
  try {
    const response = await request(`/api/storefronts/${route.params.storefrontId}/onboarding/brand`, {
      method: 'PATCH', body: JSON.stringify({
        name: brand.name, logoUrl: brand.logoUrl, logoSize: Number(brand.logoSize),
        colors: { primary: brand.primary, secondary: brand.secondary },
        announcement: { enabled: brand.announcementEnabled, text: brand.announcementText }
      })
    })
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(payload.error || 'brand_save_failed')
    }
    await load()
    brandResult.value = { completed: true }
    message.value = 'Marka bilgilerin mağazana uygulandı.'
    await nextTick()
    document.querySelector('#brand-complete')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  } catch (cause) {
    console.error('Brand setup failed', cause)
    error.value = 'Marka bilgileri kaydedilemedi. Lütfen tekrar dene.'
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  finally { savingBrand.value = false }
}
async function markPreviewOpened() {
  try {
    const response = await request(`/api/storefronts/${route.params.storefrontId}/onboarding/preview`, {
      method: 'PATCH', body: JSON.stringify({})
    })
    if (response.ok) await load()
  } catch (cause) {
    console.error('Store preview completion failed', cause)
  }
}
async function syncDomains(silent = false) {
  checkingDomains.value = true
  if (!silent) { error.value = ''; message.value = '' }
  try {
    const response = await request(`/api/storefronts/${route.params.storefrontId}/domains/sync`, {
      method: 'POST'
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.error || 'domain_sync_failed')
    domainInfo.value = payload
    if (payload.domainSetup?.completed) {
      const step = data.value?.steps?.find(item => item.step_key === 'domain_setup')
      if (step) step.status = 'completed'
      if (!silent) message.value = 'Alan adın Shopify’dan doğrulandı.'
    } else if (!silent) {
      message.value = 'Henüz aktif bir özel alan adı bulunamadı.'
    }
  } catch (cause) {
    console.error('Domain check failed', cause)
    if (!silent) error.value = 'Alan adı Shopify’dan kontrol edilemedi. Lütfen tekrar dene.'
  } finally {
    checkingDomains.value = false
  }
}
async function completeSetup() {
  completingSetup.value = true
  error.value = ''; message.value = ''
  try {
    const response = await request(`/api/storefronts/${route.params.storefrontId}/onboarding/complete`, {
      method: 'POST', body: JSON.stringify({})
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      if (payload.error === 'onboarding_incomplete') throw new Error('Kurulumu tamamlamadan önce eksik adımları bitir.')
      throw new Error('Kurulum tamamlanamadı. Lütfen tekrar dene.')
    }
    await load()
    message.value = 'Mağaza kurulumu tamamlandı.'
    await nextTick()
    document.querySelector('#setup-complete')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  } catch (cause) {
    console.error('Setup completion failed', cause)
    error.value = cause.message || 'Kurulum tamamlanamadı. Lütfen tekrar dene.'
  } finally { completingSetup.value = false }
}
onMounted(load)
</script>

<template>
  <div class="shell"><aside><p class="brand">YourProStore</p><nav><RouterLink to="/stores">Mağazalarım</RouterLink></nav></aside><main>
    <header><div><p class="eyebrow">Mağaza başlangıç sihirbazı</p><h1>{{ data?.storefront.name || 'Mağaza kurulumu' }}</h1></div><strong>%{{ progress }}</strong></header>
    <p v-if="error" class="notice error">{{ error }}</p><p v-if="message" class="notice success">{{ message }}</p>
    <section v-if="data" class="card"><p class="eyebrow">Adım 2</p><h2>Ne tür ürünler satacaksın?</h2><p class="muted">Bu seçim mağaza tasarımını değiştirmez; sana uygun banner örneklerini belirler.</p>
      <div class="choices"><label v-for="niche in data.niches" :key="niche.id" :class="{ selected: nicheId === niche.id }"><input v-model="nicheId" type="radio" :value="niche.id">{{ niche.name }}</label></div>
      <button :disabled="!nicheId" @click="save">Kaydet ve devam et</button>
    </section>
    <section v-if="data?.storefront.nicheId" class="card wizard-section">
      <p class="eyebrow">Adım 3</p><h2>Ana sayfa bannerını seç</h2>
      <p class="muted">Mağaza yapısı aynı kalır; yalnızca sektörüne uygun başlangıç görseli ve metni uygulanır.</p>
      <div v-if="bannerPresets.length" class="banner-choices">
        <label v-for="preset in bannerPresets" :key="preset.id" :class="['banner-choice', { selected: bannerPresetId === preset.id }]">
          <input v-model="bannerPresetId" type="radio" :value="preset.id">
          <img :src="preset.imageUrl" :alt="preset.name">
          <span><strong>{{ preset.name }}</strong><small>{{ preset.title }}</small></span>
        </label>
      </div>
      <p v-else class="notice">Bu sektör için banner örnekleri hazırlanıyor.</p>
      <button :disabled="!bannerPresetId" @click="saveBanner">Bannerı seç ve devam et</button>
    </section>
    <section v-if="data?.storefront.bannerPresetId" class="card wizard-section">
      <p class="eyebrow">Adım 4</p><h2>Markanı hazırla</h2>
      <p class="muted">Bu bilgileri daha sonra mağaza yönetim panelinden değiştirebilirsin.</p>
      <div class="brand-editor">
        <div class="brand-fields">
          <label>Mağaza adı<input v-model.trim="brand.name" maxlength="120" required></label>
          <label>Logo<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" :disabled="uploadingLogo" @change="chooseLogo"><small>PNG, JPG, WEBP veya SVG · en fazla 2 MB</small></label>
          <button v-if="brand.logoUrl" class="secondary-button" type="button" @click="brand.logoUrl = ''">Logoyu kaldır</button>
          <label>Logo boyutu: {{ brand.logoSize }} px<input v-model="brand.logoSize" class="range" type="range" min="80" max="320" step="10"></label>
          <div class="color-fields"><label>Ana renk<input v-model="brand.primary" type="color"></label><label>İkincil renk<input v-model="brand.secondary" type="color"></label></div>
          <button :disabled="savingBrand || uploadingLogo || !brand.name" @click="saveBrand">Markayı kaydet ve devam et</button>
        </div>
        <div class="brand-preview" :style="{ '--primary': brand.primary, '--secondary': brand.secondary }">
          <img v-if="brand.logoUrl" :src="brand.logoUrl" :alt="brand.name" :style="{ width: `${brand.logoSize}px` }"><strong v-else>{{ brand.name || 'Mağazan' }}</strong>
          <span>Örnek ürün <b>Sepete ekle</b></span>
        </div>
      </div>
    </section>
    <section v-if="brandCompleted || brandResult?.completed" id="brand-complete" class="card wizard-section completion-card">
      <p class="eyebrow">Adım 4 tamamlandı</p>
      <h2>Markan mağazana uygulandı</h2>
      <p class="muted">Logo, mağaza adı ve marka renklerin başarıyla kaydedildi.</p>
      <p class="success-text">Hazırız. Mağaza kurulumunun sonraki aşamalarına geçebiliriz.</p>
    </section>
    <section v-if="brandCompleted || brandResult?.completed" class="card wizard-section">
      <p class="eyebrow">Adım 5</p>
      <h2>Mağazanı önizle</h2>
      <p class="muted">Kaydettiğin marka ve banner ayarlarını gerçek vitrinde kontrol et.</p>
      <p class="muted">Shopify ürünlerini burada yönetmiyoruz veya veritabanımıza kopyalamıyoruz.</p>
      <div class="wizard-actions">
        <a :href="storefrontPreviewUrl" target="_blank" rel="noopener" @click="markPreviewOpened">Mağazayı önizle</a>
        <a class="secondary-link" :href="storeCmsUrl" target="_blank" rel="noopener">Mağaza CMS'ine git</a>
      </div>
      <p v-if="previewCompleted" class="success-text">Vitrin önizlemesi açıldı. Bu adım tamamlandı.</p>
    </section>
    <section v-if="previewCompleted" class="card wizard-section">
      <p class="eyebrow">Adım 6</p>
      <h2>Alan adını kontrol et</h2>
      <p class="muted">Alan adı satın alma ve DNS ayarlarını Shopify'da yapmaya devam edeceksin. Biz yalnızca bağlantının hazır olup olmadığını kontrol ediyoruz.</p>

      <div v-if="activeCustomDomain" class="domain-summary">
        <p><strong>{{ activeCustomDomain.hostname }}</strong></p>
        <p class="success-text">Özel alan adın aktif. Bu adım tamamlandı.</p>
      </div>
      <div v-else class="domain-summary">
        <p class="muted">Aktif bir özel alan adı henüz görünmüyor.</p>
        <a class="secondary-link" :href="shopifyDomainsUrl" target="_blank" rel="noopener">Shopify alan adı ayarlarını aç</a>
      </div>

      <p v-if="myshopifyDomain" class="muted">Shopify yedek adresin: <strong>{{ myshopifyDomain }}</strong></p>
      <button :disabled="checkingDomains" @click="syncDomains(false)">
        {{ checkingDomains ? 'Shopify’dan kontrol ediliyor…' : 'Shopify’dan tekrar kontrol et' }}
      </button>
      <p v-if="domainCompleted && !activeCustomDomain" class="success-text">Alan adı adımı daha önce tamamlandı.</p>
    </section>
    <section v-if="domainCompleted" id="setup-complete" class="card wizard-section completion-card">
      <p class="eyebrow">Adım 7</p>
      <template v-if="publishCompleted">
        <h2>Kurulum tamamlandı</h2>
        <p class="success-text">Mağazan aktif ve kullanıma hazır.</p>
        <div class="wizard-actions">
          <a :href="storefrontPreviewUrl" target="_blank" rel="noopener">Mağazayı görüntüle</a>
          <a class="secondary-link" :href="storeCmsUrl" target="_blank" rel="noopener">Mağaza CMS'ine git</a>
        </div>
      </template>
      <template v-else>
        <h2>Kurulumu tamamla</h2>
        <p class="muted">Seçimlerin kaydedildi. Mağazanı aktif hale getirmek için kurulumu tamamla.</p>
        <button :disabled="completingSetup || !requiredSetupCompleted" @click="completeSetup">
          {{ completingSetup ? 'Kurulum tamamlanıyor…' : 'Kurulumu tamamla' }}
        </button>
      </template>
    </section>
  </main></div>
</template>
