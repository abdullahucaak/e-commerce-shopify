<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAccountStore } from '../stores/account.js'
import {
  logoUploadErrorMessage,
  optimizeLogo,
  removeLogo,
  uploadLogo
} from '../services/storefrontAssets.js'
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
const savedLogoUrl = ref('')
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
    error.value = 'Storefront management could not be opened. Please log in again and retry.'
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
  if (!response.ok) { error.value = 'Setup information could not be loaded.'; return }
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
  savedLogoUrl.value = brand.logoUrl
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
  if (!response.ok) { error.value = 'The banner selection could not be saved.'; return }
  await load(); message.value = 'Banner selected. Next, we will prepare your brand details.'
}
async function save() {
  error.value = ''; message.value = ''
  const response = await request(`/api/storefronts/${route.params.storefrontId}/onboarding/niche`, { method: 'PATCH', body: JSON.stringify({ nicheId: nicheId.value }) })
  if (!response.ok) { error.value = 'The industry could not be saved.'; return }
  await load(); message.value = 'Industry saved. You will choose your banner next.'
}
async function chooseLogo(event) {
  const file = event.target.files?.[0]
  if (!file) return
  error.value = ''; message.value = ''
  if (file.size > 2 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    error.value = 'Choose a PNG, JPG, or WEBP logo up to 2 MB.'
    return
  }
  uploadingLogo.value = true
  try {
    const previousDraftUrl = brand.logoUrl
    brand.logoUrl = await uploadLogo({
      accessToken: account.session.access_token,
      storefrontId: route.params.storefrontId,
      file: await optimizeLogo(file)
    })
    if (previousDraftUrl && previousDraftUrl !== savedLogoUrl.value) {
      await removeLogo({
        accessToken: account.session.access_token,
        storefrontId: route.params.storefrontId,
        publicUrl: previousDraftUrl
      }).catch(() => {})
    }
    message.value = 'Logo uploaded. It will be applied when you save your brand details.'
  } catch (uploadError) { error.value = logoUploadErrorMessage(uploadError) }
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
    savedLogoUrl.value = brand.logoUrl
    brandResult.value = { completed: true }
    message.value = 'Your brand details were applied to your store.'
    await nextTick()
    document.querySelector('#brand-complete')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  } catch (cause) {
    console.error('Brand setup failed', cause)
    error.value = 'Your brand details could not be saved. Please try again.'
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
      if (!silent) message.value = 'Your domain was verified through Shopify.'
    } else if (!silent) {
      message.value = 'No active custom domain was found yet.'
    }
  } catch (cause) {
    console.error('Domain check failed', cause)
    if (!silent) error.value = 'The domain could not be checked through Shopify. Please try again.'
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
      ? 'A Shopify product was found. The product check is complete.'
      : 'No product published to the Storefront sales channel was found yet.'
  } catch (cause) {
    console.error('Product readiness check failed', cause)
    error.value = 'Shopify products could not be checked. Please try again.'
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
    message.value = 'You skipped the custom domain for now. You can connect it later from storefront management.'
  } catch (cause) {
    console.error('Domain setup skip failed', cause)
    error.value = 'The domain step could not be skipped. Please try again.'
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
      throw new Error(checkout.error || 'shopify_app_pricing_unavailable')
    }
    window.location.assign(checkout.checkoutUrl)
  } catch (cause) {
    console.error('Store plan selection failed', cause)
    if (billingIsMock.value) {
      error.value = 'The test payment could not be completed. Please try again.'
    } else error.value = 'The Shopify plan selection page could not be opened. Please try again.'
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
      activate: 'Test payment completed. This store subscription is now active.',
      reactivate: 'The test subscription was reactivated.',
      payment_failed: 'A failed payment was simulated for this store.',
      cancel: 'The test subscription was canceled for this store.',
      pause: 'The test subscription was paused for this store.'
    }
    message.value = messages[action] || 'The test subscription status was updated.'
    if (fromPlanSelection || ['activate', 'reactivate'].includes(action)) {
      await nextTick()
      document.querySelector('#setup-complete')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  } catch (cause) {
    console.error('Mock billing simulation failed', cause)
    error.value = 'The test subscription status could not be updated. Please try again.'
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
    if (!response.ok || !payload.portalUrl) throw new Error(payload.error || 'shopify_app_pricing_unavailable')
    window.location.assign(payload.portalUrl)
  } catch (cause) {
    console.error('Shopify subscription management failed', cause)
    error.value = 'Subscription management could not be opened. Please try again.'
  } finally { openingPortal.value = false }
}
async function waitForPaymentConfirmation() {
  message.value = 'Plan selected. Confirming the subscription with Shopify…'
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await request(`/api/storefronts/${route.params.storefrontId}/billing/sync`, {
      method: 'POST', body: JSON.stringify({})
    }).catch(() => null)
    await load()
    if (subscriptionActive.value) {
      message.value = 'Your payment was confirmed. You can now finish setting up your store.'
      await nextTick()
      document.querySelector('#setup-complete')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    await new Promise(resolve => window.setTimeout(resolve, 1250))
  }
  message.value = 'Shopify is still processing the subscription. Refresh the page shortly.'
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
      if (payload.error === 'onboarding_incomplete') throw new Error('Complete the missing steps before finishing setup.')
      throw new Error('Setup could not be completed. Please try again.')
    }
    await load()
    message.value = 'Store setup is complete.'
    await nextTick()
    document.querySelector('#setup-complete')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  } catch (cause) {
    console.error('Setup completion failed', cause)
    error.value = cause.message || 'Setup could not be completed. Please try again.'
  } finally { completingSetup.value = false }
}
onMounted(async () => {
  await load()
  if (route.query.billing === 'success') await waitForPaymentConfirmation()
  if (route.query.billing === 'cancelled') message.value = 'The payment was canceled; your store is not active yet.'
  if (route.query.billing === 'portal_return') message.value = 'Your subscription status is being updated from Shopify.'
})
</script>

<template>
  <div class="shell"><aside><p class="brand">YourProStore</p><nav><RouterLink to="/stores">My stores</RouterLink><RouterLink to="/subscriptions">Subscriptions</RouterLink><RouterLink to="/account">My account</RouterLink></nav></aside><main>
    <header><div><p class="eyebrow">Store setup wizard</p><h1>{{ data?.storefront.name || 'Store setup' }}</h1></div><strong>{{ progress }}%</strong></header>
    <p v-if="error" class="notice error">{{ error }}</p><p v-if="message" class="notice success">{{ message }}</p>
    <section v-if="data" class="card"><p class="eyebrow">Step 2</p><h2>What type of products will you sell?</h2><p class="muted">This choice does not change the storefront layout; it selects suitable banner examples.</p>
      <div class="choices"><label v-for="niche in data.niches" :key="niche.id" :class="{ selected: nicheId === niche.id }"><input v-model="nicheId" type="radio" :value="niche.id">{{ niche.name }}</label></div>
      <button :disabled="!nicheId" @click="save">Save and continue</button>
    </section>
    <section v-if="data?.storefront.nicheId" class="card wizard-section">
      <p class="eyebrow">Step 3</p><h2>Choose your homepage banner</h2>
      <p class="muted">The storefront structure stays the same; only the starting image and copy for your industry are applied.</p>
      <div v-if="bannerPresets.length" class="banner-choices">
        <label v-for="preset in bannerPresets" :key="preset.id" :class="['banner-choice', { selected: bannerPresetId === preset.id }]">
          <input v-model="bannerPresetId" type="radio" :value="preset.id">
          <img :src="preset.imageUrl" :alt="preset.name">
          <span><strong>{{ preset.name }}</strong><small>{{ preset.title }}</small></span>
        </label>
      </div>
      <p v-else class="notice">Banner examples for this industry are being prepared.</p>
      <button :disabled="!bannerPresetId" @click="saveBanner">Choose banner and continue</button>
    </section>
    <section v-if="data?.storefront.bannerPresetId" class="card wizard-section">
      <p class="eyebrow">Step 4</p><h2>Set up your brand</h2>
      <p class="muted">You can change these details later from storefront management.</p>
      <div class="brand-editor">
        <div class="brand-fields">
          <label>Store name<input v-model.trim="brand.name" maxlength="120" required></label>
          <label>Logo<input type="file" accept="image/png,image/jpeg,image/webp" :disabled="uploadingLogo" @change="chooseLogo"><small>PNG, JPG, or WEBP · 64×32–2400×1200 px · up to 2 MB</small></label>
          <button v-if="brand.logoUrl" class="secondary-button" type="button" @click="brand.logoUrl = ''">Remove logo</button>
          <label>Logo size: {{ brand.logoSize }} px<input v-model="brand.logoSize" class="range" type="range" min="80" max="320" step="10"></label>
          <div class="color-fields"><label>Primary color<input v-model="brand.primary" type="color"></label><label>Secondary color<input v-model="brand.secondary" type="color"></label></div>
          <button :disabled="savingBrand || uploadingLogo || !brand.name" @click="saveBrand">Save brand and continue</button>
        </div>
        <div class="brand-preview" :style="{ '--primary': brand.primary, '--secondary': brand.secondary }">
          <img v-if="brand.logoUrl" :src="brand.logoUrl" :alt="brand.name" :style="{ width: `${brand.logoSize}px` }"><strong v-else>{{ brand.name || 'Your store' }}</strong>
          <span>Sample product <b>Add to cart</b></span>
        </div>
      </div>
    </section>
    <section v-if="brandCompleted || brandResult?.completed" id="brand-complete" class="card wizard-section completion-card">
      <p class="eyebrow">Step 4 complete</p>
      <h2>Your brand was applied to your store</h2>
      <p class="muted">Your logo, store name, and brand colors were saved.</p>
      <p class="success-text">Ready. You can continue with the next setup steps.</p>
    </section>
    <section v-if="brandCompleted || brandResult?.completed" class="card wizard-section">
      <p class="eyebrow">Step 5</p>
      <h2>Check Shopify products</h2>
      <p class="muted">We do not copy products into our database. We only check through the Shopify Storefront API whether at least one product is ready for sale.</p>
      <div v-if="productReady" class="subscription-summary">
        <p class="success-text"><strong>Product ready.</strong> At least one Shopify product can be displayed in your store.</p>
      </div>
      <div v-else>
        <p v-if="productReadinessStep?.status === 'in_progress'" class="notice">No product published to the Storefront sales channel was found yet.</p>
        <div class="wizard-actions">
          <a class="secondary-link" :href="shopifyProductsUrl" target="_blank" rel="noopener">Add your first product in Shopify</a>
          <button :disabled="checkingProducts" @click="checkProducts">
            {{ checkingProducts ? 'Checking products…' : 'Check Shopify products' }}
          </button>
        </div>
      </div>
    </section>
    <section v-if="productReady" class="card wizard-section">
      <p class="eyebrow">Step 6</p>
      <h2>Preview your store</h2>
      <p class="muted">Review your saved brand and banner settings in the real storefront.</p>
      <p class="muted">We do not manage Shopify products here or copy them into our database.</p>
      <div class="wizard-actions">
        <a :href="storefrontPreviewUrl" target="_blank" rel="noopener" @click="markPreviewOpened">Preview store</a>
        <button class="secondary-button" :disabled="openingStorefrontAdmin" @click="manageStorefront">{{ openingStorefrontAdmin ? 'Opening management…' : 'Go to storefront management' }}</button>
      </div>
      <p v-if="previewCompleted" class="success-text">The storefront preview was opened. This step is complete.</p>
    </section>
    <section v-if="previewCompleted" class="card wizard-section">
      <p class="eyebrow">Step 7</p>
      <h2>Check your domain</h2>
      <p class="muted">This step is optional. Connect a domain now, or finish setup and add one later from storefront management.</p>

      <div v-if="activeCustomDomain" class="domain-summary">
        <p><strong>{{ activeCustomDomain.hostname }}</strong></p>
        <p class="success-text">Your custom domain is active. This step is complete.</p>
      </div>
      <div v-else class="domain-summary">
        <p class="muted">No active custom domain is visible yet.</p>
        <a class="secondary-link" :href="shopifyDomainsUrl" target="_blank" rel="noopener">Open Shopify domain settings</a>
      </div>

      <p v-if="myshopifyDomain" class="muted">Your Shopify fallback address: <strong>{{ myshopifyDomain }}</strong></p>
      <button :disabled="checkingDomains" @click="syncDomains(false)">
        {{ checkingDomains ? 'Checking through Shopify…' : 'Check again through Shopify' }}
      </button>
      <button v-if="!domainCompleted" class="secondary-button" :disabled="skippingDomain" @click="skipDomain">
        {{ skippingDomain ? 'Skipping step…' : 'Skip for now' }}
      </button>
      <p v-if="domainSkipped" class="success-text">The domain was skipped for now. You can add one later.</p>
      <p v-else-if="domainCompleted && !activeCustomDomain" class="success-text">The domain step was completed earlier.</p>
    </section>
    <section v-if="domainCompleted" class="card wizard-section">
      <p class="eyebrow">Step 8</p>
      <h2>Choose a plan for your store</h2>
      <p v-if="billingIsMock" class="notice">Development mode: no real charge is made. The test action changes only this store’s subscription status.</p>
      <p v-else class="muted">Each Shopify store requires a separate subscription. Shopify displays the plan, handles approval, and adds the charge to the store’s Shopify invoice.</p>
      <div v-if="subscriptionActive" class="subscription-summary">
        <p class="success-text"><strong>Subscription active.</strong> {{ billingIsMock ? 'The test payment for this store is complete.' : 'Payment for this store was verified.' }}</p>
        <p v-if="data?.subscription?.cancel_at_period_end" class="muted">The subscription will end after the current billing period.</p>
        <button v-if="canManageBilling && !billingIsMock" class="secondary-button" :disabled="openingPortal" @click="openBillingPortal">
          {{ openingPortal ? 'Opening Shopify…' : 'Manage subscription' }}
        </button>
        <details v-if="billingIsMock" class="mock-controls">
          <summary>Simulate test subscription states</summary>
          <div class="wizard-actions">
            <button class="secondary-button" :disabled="simulatingBilling" @click="simulateMockBilling('payment_failed')">Failed payment</button>
            <button class="secondary-button" :disabled="simulatingBilling" @click="simulateMockBilling('pause')">Pause</button>
            <button class="secondary-button" :disabled="simulatingBilling" @click="simulateMockBilling('cancel')">Cancel</button>
          </div>
        </details>
      </div>
      <div v-else class="plan-choices">
        <label v-for="plan in data?.plans || []" :key="plan.key" :class="['plan-choice', { selected: selectedPlanKey === plan.key }]">
          <input v-model="selectedPlanKey" type="radio" :value="plan.key">
          <span><strong>{{ plan.name }}</strong><small>{{ plan.description }}</small></span>
          <b>{{ formatPlanPrice(plan) }} <small>/ month</small></b>
        </label>
      </div>
      <template v-if="!subscriptionActive">
        <p v-if="subscriptionNeedsAttention" class="notice error">Payment must be updated; this store is suspended until payment is fixed.</p>
        <button v-if="billingIsMock && subscriptionNeedsAttention" :disabled="simulatingBilling" @click="simulateMockBilling('reactivate')">
          {{ simulatingBilling ? 'Updating test subscription…' : 'Reactivate test subscription' }}
        </button>
        <button v-else-if="subscriptionNeedsAttention && canManageBilling" :disabled="openingPortal" @click="openBillingPortal">
          {{ openingPortal ? 'Opening Shopify…' : 'Manage subscription in Shopify' }}
        </button>
        <button v-else :disabled="savingPlan || !selectedPlanKey" @click="savePlan">
          {{ savingPlan ? (billingIsMock ? 'Completing test payment…' : 'Opening Shopify…') : (billingIsMock ? 'Choose plan and complete test payment' : 'Choose plan in Shopify') }}
        </button>
        <p v-if="planCompleted" id="plan-complete" class="muted">Plan selected; {{ billingIsMock ? 'activate the test subscription' : 'approve it in Shopify' }} to finish setup.</p>
      </template>
    </section>
    <section v-if="subscriptionActive" id="setup-complete" class="card wizard-section completion-card">
      <p class="eyebrow">Step 9</p>
      <template v-if="publishCompleted">
        <h2>Setup complete</h2>
        <p class="success-text">Your store is active and ready to use.</p>
        <div class="wizard-actions">
          <a :href="storefrontPreviewUrl" target="_blank" rel="noopener">View store</a>
          <button class="secondary-button" :disabled="openingStorefrontAdmin" @click="manageStorefront">{{ openingStorefrontAdmin ? 'Opening management…' : 'Go to storefront management' }}</button>
        </div>
      </template>
      <template v-else>
        <h2>Finish setup</h2>
        <p class="muted">Your choices are saved. Finish setup to activate your store.</p>
        <button :disabled="completingSetup || !requiredSetupCompleted" @click="completeSetup">
          {{ completingSetup ? 'Finishing setup…' : 'Finish setup' }}
        </button>
      </template>
    </section>
  </main></div>
</template>
