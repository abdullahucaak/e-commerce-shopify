<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAccountStore } from '../stores/account.js'
import { supabase } from '../services/supabase.js'
import { optimizeLogo, uploadLogo } from '../services/storefrontAssets.js'
import { calculateSetupProgress, SETUP_STEP_KEYS } from '../services/onboardingPresentation.js'
import { openStorefrontAdmin } from '../services/adminHandoff.js'

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
const checkingProducts = ref(false)
const skippingDomain = ref(false)
const domainChecked = ref(false)
const savingPlan = ref(false)
const openingPortal = ref(false)
const simulatingBilling = ref(false)
const selectedPlanKey = ref('')
const completingSetup = ref(false)
const openingStorefrontAdmin = ref(false)
const brand = reactive({
  name: '', logoUrl: '', logoSize: 180, primary: '#303841', secondary: '#007dcc',
  announcementEnabled: true,
  announcementText: "Until October 20th, enjoy a 10% discount on every product with the code 'SAYHIGLOW'!"
})
const progress = computed(() => {
  return calculateSetupProgress(data.value?.steps, data.value?.subscription?.status)
})
const bannerPresets = computed(() => (data.value?.bannerPresets || []).filter(preset => preset.nicheId === nicheId.value))
const brandCompleted = computed(() => data.value?.steps?.some(step => step.step_key === 'brand_setup' && step.status === 'completed'))
const productReadinessStep = computed(() => data.value?.steps?.find(step => step.step_key === 'product_readiness'))
const productReady = computed(() => productReadinessStep.value?.status === 'completed')
const previewCompleted = computed(() => data.value?.steps?.some(step => step.step_key === 'store_preview' && step.status === 'completed'))
const domainStep = computed(() => data.value?.steps?.find(step => step.step_key === 'domain_setup'))
const domainCompleted = computed(() => domainStep.value?.status === 'completed')
const domainSkipped = computed(() => domainStep.value?.data?.skipped === true)
const planCompleted = computed(() => data.value?.steps?.some(step => step.step_key === 'plan_selection' && step.status === 'completed'))
const subscriptionStatus = computed(() => data.value?.subscription?.status || 'incomplete')
const subscriptionActive = computed(() => ['active', 'trialing'].includes(subscriptionStatus.value))
const billingProvider = computed(() => data.value?.billing?.provider || 'disabled')
const billingIsMock = computed(() => billingProvider.value === 'mock')
const canManageBilling = computed(() => Boolean(data.value?.subscription?.can_manage_billing))
const subscriptionNeedsAttention = computed(() => (
  ['past_due', 'paused', 'canceled'].includes(subscriptionStatus.value) ||
  (subscriptionStatus.value === 'incomplete' && canManageBilling.value)
))
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
const shopifyProductsUrl = computed(() => {
  const handle = myshopifyDomain.value.replace(/\.myshopify\.com$/i, '')
  return handle ? `https://admin.shopify.com/store/${handle}/products` : 'https://admin.shopify.com/'
})
const storefrontPreviewUrl = computed(() => {
  const url = new URL(import.meta.env.VITE_STOREFRONT_PREVIEW_URL || 'http://127.0.0.1:5173/')
  if (data.value?.storefront.myshopifyDomain) url.searchParams.set('previewHost', data.value.storefront.myshopifyDomain)
  return url.toString()
})
async function manageStorefront() {
  openingStorefrontAdmin.value = true
  error.value = ''
  try {
    await openStorefrontAdmin({
      session: account.session,
      storefrontId: route.params.storefrontId,
      page: 'design'
    })
  } catch {
    error.value = 'Storefront yönetimi açılamadı. Lütfen tekrar giriş yapıp yeniden dene.'
    openingStorefrontAdmin.value = false
  }
}

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
  selectedPlanKey.value = data.value.subscription?.plan_key || data.value.plans?.[0]?.key || ''
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
async function checkProducts() {
  checkingProducts.value = true
  error.value = ''; message.value = ''
  try {
    const response = await request(`/api/storefronts/${route.params.storefrontId}/onboarding/products/check`, {
      method: 'POST', body: JSON.stringify({})
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.error || 'product_readiness_failed')
    await load()
    message.value = payload.ready
      ? 'Shopify ürünün bulundu. Ürün kontrolü tamamlandı.'
      : 'Henüz Storefront satış kanalında yayınlanmış ürün bulunamadı.'
  } catch (cause) {
    console.error('Product readiness check failed', cause)
    error.value = 'Shopify ürünleri kontrol edilemedi. Lütfen tekrar dene.'
  } finally {
    checkingProducts.value = false
  }
}
async function skipDomain() {
  skippingDomain.value = true
  error.value = ''; message.value = ''
  try {
    const response = await request(`/api/storefronts/${route.params.storefrontId}/onboarding/domain/skip`, {
      method: 'PATCH', body: JSON.stringify({})
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.error || 'domain_skip_failed')
    await load()
    message.value = 'Özel alan adını şimdilik atladın. Daha sonra storefront yönetiminden bağlayabilirsin.'
  } catch (cause) {
    console.error('Domain setup skip failed', cause)
    error.value = 'Alan adı adımı atlanamadı. Lütfen tekrar dene.'
  } finally {
    skippingDomain.value = false
  }
}
function formatPlanPrice(plan) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: plan.currencyCode || 'USD'
  }).format((Number(plan.unitAmount) || 0) / 100)
}
async function savePlan() {
  savingPlan.value = true
  error.value = ''; message.value = ''
  try {
    const response = await request(`/api/storefronts/${route.params.storefrontId}/onboarding/plan`, {
      method: 'PATCH', body: JSON.stringify({ planKey: selectedPlanKey.value })
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.error || 'plan_save_failed')
    if (billingIsMock.value) {
      await simulateMockBilling('activate', { fromPlanSelection: true })
      return
    }
    const checkoutResponse = await request(`/api/storefronts/${route.params.storefrontId}/billing/checkout`, {
      method: 'POST', body: JSON.stringify({})
    })
    const checkout = await checkoutResponse.json().catch(() => ({}))
    if (!checkoutResponse.ok || !checkout.checkoutUrl) {
      throw new Error(checkout.error || 'stripe_checkout_failed')
    }
    window.location.assign(checkout.checkoutUrl)
  } catch (cause) {
    console.error('Store plan selection failed', cause)
    if (billingIsMock.value) {
      error.value = 'Test ödemesi tamamlanamadı. Lütfen tekrar dene.'
    } else if (cause.message === 'store_subscription_requires_management') {
      error.value = 'Bu aboneliğin ödeme bilgilerini Stripe müşteri portalından güncellemen gerekiyor.'
    } else {
      error.value = 'Güvenli ödeme sayfası açılamadı. Lütfen tekrar dene.'
    }
  } finally { savingPlan.value = false }
}
async function simulateMockBilling(action, { fromPlanSelection = false } = {}) {
  simulatingBilling.value = true
  error.value = ''; message.value = ''
  try {
    const response = await request(`/api/storefronts/${route.params.storefrontId}/billing/mock`, {
      method: 'POST', body: JSON.stringify({ action })
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.error || 'mock_billing_failed')
    await load()
    const messages = {
      activate: 'Test ödemesi tamamlandı. Bu mağazanın aboneliği aktif edildi.',
      reactivate: 'Test aboneliği yeniden etkinleştirildi.',
      payment_failed: 'Başarısız ödeme durumu bu mağaza için simüle edildi.',
      cancel: 'Test aboneliği bu mağaza için iptal edildi.',
      pause: 'Test aboneliği bu mağaza için duraklatıldı.'
    }
    message.value = messages[action] || 'Test abonelik durumu güncellendi.'
    if (fromPlanSelection || ['activate', 'reactivate'].includes(action)) {
      await nextTick()
      document.querySelector('#setup-complete')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  } catch (cause) {
    console.error('Mock billing simulation failed', cause)
    error.value = 'Test abonelik durumu güncellenemedi. Lütfen tekrar dene.'
    if (fromPlanSelection) throw cause
  } finally {
    simulatingBilling.value = false
  }
}
async function openBillingPortal() {
  openingPortal.value = true
  error.value = ''; message.value = ''
  try {
    const response = await request(`/api/storefronts/${route.params.storefrontId}/billing/portal`, {
      method: 'POST', body: JSON.stringify({})
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || !payload.portalUrl) throw new Error(payload.error || 'stripe_portal_failed')
    window.location.assign(payload.portalUrl)
  } catch (cause) {
    console.error('Stripe billing portal failed', cause)
    error.value = 'Abonelik yönetimi açılamadı. Lütfen tekrar dene.'
  } finally { openingPortal.value = false }
}
async function waitForPaymentConfirmation() {
  message.value = 'Ödeme tamamlandı. Stripe onayı bekleniyor…'
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await load()
    if (subscriptionActive.value) {
      message.value = 'Ödemen onaylandı. Artık mağaza kurulumunu tamamlayabilirsin.'
      await nextTick()
      document.querySelector('#setup-complete')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    await new Promise(resolve => window.setTimeout(resolve, 1250))
  }
  message.value = 'Ödeme alındı; abonelik onayı işleniyor. Biraz sonra sayfayı yenileyebilirsin.'
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
onMounted(async () => {
  await load()
  if (route.query.billing === 'success') await waitForPaymentConfirmation()
  if (route.query.billing === 'cancelled') message.value = 'Ödeme işlemi iptal edildi; mağazan henüz aktif değil.'
  if (route.query.billing === 'portal_return') message.value = 'Abonelik durumun Stripe’dan güncelleniyor.'
})
</script>

<template>
  <div class="shell"><aside><p class="brand">YourProStore</p><nav><RouterLink to="/stores">Mağazalarım</RouterLink><RouterLink to="/subscriptions">Abonelikler</RouterLink><RouterLink to="/account">Hesabım</RouterLink></nav></aside><main>
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
      <h2>Shopify ürünlerini kontrol et</h2>
      <p class="muted">Ürünleri veritabanımıza kopyalamıyoruz. Shopify Storefront API üzerinden yalnızca satışa hazır en az bir ürün olup olmadığını kontrol ediyoruz.</p>
      <div v-if="productReady" class="subscription-summary">
        <p class="success-text"><strong>Ürün hazır.</strong> Mağazanda gösterilebilecek en az bir Shopify ürünü bulundu.</p>
      </div>
      <div v-else>
        <p v-if="productReadinessStep?.status === 'in_progress'" class="notice">Henüz Storefront satış kanalında yayınlanmış ürün bulunamadı.</p>
        <div class="wizard-actions">
          <a class="secondary-link" :href="shopifyProductsUrl" target="_blank" rel="noopener">Shopify’da ilk ürününü ekle</a>
          <button :disabled="checkingProducts" @click="checkProducts">
            {{ checkingProducts ? 'Ürünler kontrol ediliyor…' : 'Shopify ürünlerini kontrol et' }}
          </button>
        </div>
      </div>
    </section>
    <section v-if="productReady" class="card wizard-section">
      <p class="eyebrow">Adım 6</p>
      <h2>Mağazanı önizle</h2>
      <p class="muted">Kaydettiğin marka ve banner ayarlarını gerçek vitrinde kontrol et.</p>
      <p class="muted">Shopify ürünlerini burada yönetmiyoruz veya veritabanımıza kopyalamıyoruz.</p>
      <div class="wizard-actions">
        <a :href="storefrontPreviewUrl" target="_blank" rel="noopener" @click="markPreviewOpened">Mağazayı önizle</a>
        <button class="secondary-button" :disabled="openingStorefrontAdmin" @click="manageStorefront">{{ openingStorefrontAdmin ? 'Yönetim açılıyor…' : 'Storefront yönetimine git' }}</button>
      </div>
      <p v-if="previewCompleted" class="success-text">Vitrin önizlemesi açıldı. Bu adım tamamlandı.</p>
    </section>
    <section v-if="previewCompleted" class="card wizard-section">
      <p class="eyebrow">Adım 7</p>
      <h2>Alan adını kontrol et</h2>
      <p class="muted">Bu adım opsiyoneldir. Alan adını şimdi bağlayabilir veya kurulumu tamamlayıp daha sonra storefront yönetiminden ekleyebilirsin.</p>

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
      <button v-if="!domainCompleted" class="secondary-button" :disabled="skippingDomain" @click="skipDomain">
        {{ skippingDomain ? 'Adım atlanıyor…' : 'Şimdilik atla' }}
      </button>
      <p v-if="domainSkipped" class="success-text">Alan adı şimdilik atlandı. Daha sonra ekleyebilirsin.</p>
      <p v-else-if="domainCompleted && !activeCustomDomain" class="success-text">Alan adı adımı daha önce tamamlandı.</p>
    </section>
    <section v-if="domainCompleted" class="card wizard-section">
      <p class="eyebrow">Adım 8</p>
      <h2>Mağazan için planını seç</h2>
      <p v-if="billingIsMock" class="notice">Geliştirme modu: gerçek ücret alınmaz. Test işlemi yalnızca bu mağazanın abonelik durumunu değiştirir.</p>
      <p v-else class="muted">Her Shopify mağazası ayrı abonelik gerektirir. Ödeme Stripe’ın güvenli ödeme sayfasında alınır ve yalnızca bu mağazayı etkinleştirir.</p>
      <div v-if="subscriptionActive" class="subscription-summary">
        <p class="success-text"><strong>Abonelik aktif.</strong> {{ billingIsMock ? 'Bu mağaza için test ödemesi tamamlandı.' : 'Bu mağaza için ödeme doğrulandı.' }}</p>
        <p v-if="data?.subscription?.cancel_at_period_end" class="muted">Abonelik dönem sonunda sona erecek.</p>
        <button v-if="canManageBilling && !billingIsMock" class="secondary-button" :disabled="openingPortal" @click="openBillingPortal">
          {{ openingPortal ? 'Stripe açılıyor…' : 'Aboneliği yönet' }}
        </button>
        <details v-if="billingIsMock" class="mock-controls">
          <summary>Test abonelik durumlarını simüle et</summary>
          <div class="wizard-actions">
            <button class="secondary-button" :disabled="simulatingBilling" @click="simulateMockBilling('payment_failed')">Başarısız ödeme</button>
            <button class="secondary-button" :disabled="simulatingBilling" @click="simulateMockBilling('pause')">Duraklat</button>
            <button class="secondary-button" :disabled="simulatingBilling" @click="simulateMockBilling('cancel')">İptal et</button>
          </div>
        </details>
      </div>
      <div v-else class="plan-choices">
        <label v-for="plan in data?.plans || []" :key="plan.key" :class="['plan-choice', { selected: selectedPlanKey === plan.key }]">
          <input v-model="selectedPlanKey" type="radio" :value="plan.key">
          <span><strong>{{ plan.name }}</strong><small>{{ plan.description }}</small></span>
          <b>{{ formatPlanPrice(plan) }} <small>/ ay</small></b>
        </label>
      </div>
      <template v-if="!subscriptionActive">
        <p v-if="subscriptionNeedsAttention" class="notice error">Ödeme güncellenmeli; bu mağazanın yayını ödeme düzelene kadar durduruldu.</p>
        <button v-if="billingIsMock && subscriptionNeedsAttention" :disabled="simulatingBilling" @click="simulateMockBilling('reactivate')">
          {{ simulatingBilling ? 'Test aboneliği güncelleniyor…' : 'Test aboneliğini yeniden etkinleştir' }}
        </button>
        <button v-else-if="subscriptionNeedsAttention && canManageBilling" :disabled="openingPortal" @click="openBillingPortal">
          {{ openingPortal ? 'Stripe açılıyor…' : 'Ödeme bilgilerini güncelle' }}
        </button>
        <button v-else :disabled="savingPlan || !selectedPlanKey" @click="savePlan">
          {{ savingPlan ? (billingIsMock ? 'Test ödemesi tamamlanıyor…' : 'Güvenli ödeme hazırlanıyor…') : (billingIsMock ? 'Planı seç ve test ödemesini tamamla' : 'Planı seç ve güvenli ödemeye geç') }}
        </button>
        <p v-if="planCompleted" id="plan-complete" class="muted">Plan seçildi; kurulumu tamamlamak için {{ billingIsMock ? 'test aboneliğinin etkinleştirilmesi' : 'ödemenin onaylanması' }} gerekiyor.</p>
      </template>
    </section>
    <section v-if="subscriptionActive" id="setup-complete" class="card wizard-section completion-card">
      <p class="eyebrow">Adım 9</p>
      <template v-if="publishCompleted">
        <h2>Kurulum tamamlandı</h2>
        <p class="success-text">Mağazan aktif ve kullanıma hazır.</p>
        <div class="wizard-actions">
          <a :href="storefrontPreviewUrl" target="_blank" rel="noopener">Mağazayı görüntüle</a>
          <button class="secondary-button" :disabled="openingStorefrontAdmin" @click="manageStorefront">{{ openingStorefrontAdmin ? 'Yönetim açılıyor…' : 'Storefront yönetimine git' }}</button>
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
