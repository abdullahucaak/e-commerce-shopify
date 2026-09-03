<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useAuthStore } from '../stores/authStore'
import {
  optimizeRasterImage,
  removeStorefrontAsset,
  storefrontAssetErrorMessage,
  uploadStorefrontAsset
} from '../services/storefrontAssets'
import { buildStorefrontPreviewUrl, createStorefrontPreview } from '../services/storefrontPreview'

const authStore = useAuthStore()
const canEditContent = computed(() => authStore.canEditContent)
const stores = computed(() => (authStore.workspace?.stores || []).filter(store => store.storefront))
const selectedStoreId = computed({
  get: () => authStore.selectedStoreId || stores.value[0]?.id || '',
  set: value => { authStore.selectedStoreId = value }
})
const selectedStore = computed(() => stores.value.find(store => store.id === selectedStoreId.value))
const previewFrame = ref(null)
const storefrontUrl = (import.meta.env.VITE_STOREFRONT_PREVIEW_URL || 'http://127.0.0.1:5173/').trim()
const previewHostname = ref('')
const previewToken = ref('')
const previewPage = ref('/')
const previewPages = [
  { label: 'Home', path: '/' },
  { label: 'Shop', path: '/shop' },
  { label: 'About Us', path: '/about-us' }
]
const previewUrl = computed(() => {
  if (!previewHostname.value || !previewToken.value) return ''
  return buildStorefrontPreviewUrl({
    baseUrl: storefrontUrl,
    page: previewPage.value,
    hostname: previewHostname.value,
    token: previewToken.value
  })
})
const liveStorefrontUrl = ref('')
const loading = ref(false)
const saving = ref(false)
const publishing = ref(false)
const uploading = ref(false)
const uploadingHero = ref(false)
const message = ref('')
const error = ref('')
const savedHeroImageUrl = ref('')
const savedAboutImageUrl = ref('')
const publishedVersion = ref(null)
const draftVersion = ref(null)
const hasUnpublishedChanges = ref(false)
const savedSnapshot = ref('')
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

function contentRequestBody() {
  return {
    home: { ...form.home },
    shop: { ...form.shop },
    about: { ...form.about },
    footer: {
      emails: form.footer.emails.map(value => value.trim()).filter(Boolean),
      social: { ...form.footer.social }
    }
  }
}

function contentSnapshot() {
  return JSON.stringify(contentRequestBody())
}

const hasLocalChanges = computed(() => (
  Boolean(savedSnapshot.value) && contentSnapshot() !== savedSnapshot.value
))
const versionStatus = computed(() => {
  if (hasLocalChanges.value) return 'You have unsaved changes.'
  if (hasUnpublishedChanges.value) {
    return `Draft version ${draftVersion.value} is ready · live version ${publishedVersion.value || 'none'}.`
  }
  return publishedVersion.value
    ? `Matches live version ${publishedVersion.value}.`
    : 'There is no live version yet.'
})

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
  savedSnapshot.value = ''
  publishedVersion.value = null
  draftVersion.value = null
  hasUnpublishedChanges.value = false
  try {
    const response = await request(`/api/storefronts/${storefrontId}/content`)
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error)
    fillForm(payload.settings)
    savedHeroImageUrl.value = form.home.heroImageUrl
    savedAboutImageUrl.value = form.about.imageUrl
    publishedVersion.value = payload.publishedVersion
    draftVersion.value = payload.draftVersion
    hasUnpublishedChanges.value = payload.hasUnpublishedChanges === true
    savedSnapshot.value = contentSnapshot()
  } catch {
    error.value = 'Content settings could not be loaded.'
  } finally {
    loading.value = false
  }
}

async function loadPreviewDomain() {
  const storefrontId = selectedStore.value?.storefront?.id
  previewHostname.value = ''
  previewToken.value = ''
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
    if (previewDomain?.hostname) {
      const preview = await createStorefrontPreview({
        accessToken: authStore.session.access_token,
        storefrontId
      })
      previewHostname.value = preview.hostname
      previewToken.value = preview.token
    }
    liveStorefrontUrl.value = publicDomain
      ? `https://${publicDomain.hostname}`
      : previewUrl.value
  } catch {
    previewHostname.value = ''
    previewToken.value = ''
  }
}

async function loadSelectedStore() {
  await Promise.all([loadContent(), loadPreviewDomain()])
}

async function uploadAboutImage(event) {
  if (!canEditContent.value) return
  const file = event.target.files?.[0]
  if (!file) return
  error.value = ''
  message.value = ''
  if (file.size > 5 * 1024 * 1024) {
    error.value = 'The About Us image can be up to 5 MB.'
    return
  }
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    error.value = 'Choose a JPG, PNG, or WEBP image.'
    return
  }
  uploading.value = true
  try {
    const optimizedFile = await optimizeRasterImage(file, { maxWidth: 1800, maxHeight: 1800 })
    const previousDraftUrl = form.about.imageUrl
    form.about.imageUrl = await uploadStorefrontAsset({
      accessToken: authStore.session.access_token,
      storefrontId: selectedStore.value.storefront.id,
      purpose: 'about',
      file: optimizedFile
    })
    if (previousDraftUrl && previousDraftUrl !== savedAboutImageUrl.value) {
      await removeStorefrontAsset({
        accessToken: authStore.session.access_token,
        storefrontId: selectedStore.value.storefront.id,
        publicUrl: previousDraftUrl
      }).catch(() => {})
    }
    message.value = 'Image selected. Save the content draft, then publish it.'
  } catch (uploadError) {
    error.value = storefrontAssetErrorMessage(uploadError, 'About Us image')
  } finally {
    uploading.value = false
  }
}

async function uploadHeroImage(event) {
  if (!canEditContent.value) return
  const file = event.target.files?.[0]
  if (!file) return
  error.value = ''
  message.value = ''
  if (file.size > 8 * 1024 * 1024) {
    error.value = 'The banner image can be up to 8 MB.'
    return
  }
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    error.value = 'Choose a JPG, PNG, or WEBP banner image.'
    return
  }
  uploadingHero.value = true
  try {
    const optimizedFile = await optimizeRasterImage(file, { maxWidth: 2560, maxHeight: 1440 })
    const previousDraftUrl = form.home.heroImageUrl
    form.home.heroImageUrl = await uploadStorefrontAsset({
      accessToken: authStore.session.access_token,
      storefrontId: selectedStore.value.storefront.id,
      purpose: 'hero',
      file: optimizedFile
    })
    if (previousDraftUrl && previousDraftUrl !== savedHeroImageUrl.value) {
      await removeStorefrontAsset({
        accessToken: authStore.session.access_token,
        storefrontId: selectedStore.value.storefront.id,
        publicUrl: previousDraftUrl
      }).catch(() => {})
    }
    message.value = 'Banner image selected. Save the content draft, then publish it.'
  } catch (uploadError) {
    error.value = storefrontAssetErrorMessage(uploadError, 'Banner')
  } finally {
    uploadingHero.value = false
  }
}

async function saveContent() {
  if (!canEditContent.value) return
  saving.value = true
  message.value = ''
  error.value = ''
  try {
    const response = await request(`/api/storefronts/${selectedStore.value.storefront.id}/content`, {
      method: 'PUT',
      body: JSON.stringify(contentRequestBody())
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error)
    savedHeroImageUrl.value = form.home.heroImageUrl
    savedAboutImageUrl.value = form.about.imageUrl
    publishedVersion.value = payload.publishedVersion
    draftVersion.value = payload.draftVersion
    hasUnpublishedChanges.value = payload.hasUnpublishedChanges === true
    savedSnapshot.value = contentSnapshot()
    message.value = hasUnpublishedChanges.value
      ? `Content draft saved (draft version ${draftVersion.value}). The live store did not change.`
      : 'The content now matches the live version; there is no pending draft.'
  } catch {
    error.value = 'Content could not be saved. Check the fields and links.'
  } finally {
    saving.value = false
  }
}

async function publishContent() {
  if (!canEditContent.value || hasLocalChanges.value || !hasUnpublishedChanges.value) return
  publishing.value = true
  message.value = ''
  error.value = ''
  try {
    const response = await request(
      `/api/storefronts/${selectedStore.value.storefront.id}/content/publish`,
      { method: 'POST' }
    )
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error)
    publishedVersion.value = payload.publishedVersion
    draftVersion.value = payload.draftVersion
    hasUnpublishedChanges.value = payload.hasUnpublishedChanges === true
    savedSnapshot.value = contentSnapshot()
    message.value = `Content published to the live store (version ${publishedVersion.value}).`
  } catch (publishError) {
    error.value = publishError.message === 'storefront_no_draft_changes'
      ? 'There is no saved content draft to publish.'
      : 'The content could not be published. Please try again.'
  } finally {
    publishing.value = false
  }
}

watch(selectedStoreId, loadSelectedStore)
watch(form, sendPreview, { deep: true })
onMounted(loadSelectedStore)
</script>

<template>
  <div class="page-shell">
    <aside>
      <div><p class="wordmark">YourProStore.ai</p><p class="wordmark-subtitle">storefront admin</p></div>
      <nav>
        <RouterLink to="/dashboard">Overview</RouterLink>
        <RouterLink to="/design">Design settings</RouterLink>
        <RouterLink to="/content">Content settings</RouterLink>
        <RouterLink to="/domains">Domain settings</RouterLink>
        <RouterLink to="/versions">Version history</RouterLink>
      </nav>
    </aside>
    <main>
      <header>
        <div><p class="eyebrow">Storefront</p><h1>Content settings</h1></div>
        <div class="header-actions">
          <a v-if="liveStorefrontUrl" class="storefront-link" :href="liveStorefrontUrl" target="_blank" rel="noopener">View store</a>
          <select v-model="selectedStoreId" aria-label="Select store">
            <option v-for="store in stores" :key="store.id" :value="store.id">{{ store.name }}</option>
          </select>
        </div>
      </header>

      <form v-if="selectedStore" @submit.prevent="saveContent">
        <p v-if="!canEditContent" class="permission-notice">
          Your role can view content; owners, admins, and editors can make changes.
        </p>
        <section class="storefront-preview">
          <div class="preview-title">
            <div><p>Live store preview</p><small>Changes appear here before you save.</small></div>
            <label class="preview-page-select">Displayed page
              <select v-model="previewPage">
                <option v-for="page in previewPages" :key="page.path" :value="page.path">{{ page.label }}</option>
              </select>
            </label>
          </div>
          <iframe v-if="previewUrl" ref="previewFrame" :src="previewUrl" title="Store content preview" referrerpolicy="no-referrer" @load="sendPreview"></iframe>
          <p v-else class="preview-unavailable">To preview this store, first update its Shopify domains from Domain settings.</p>
        </section>
        <section>
          <h2>Home page</h2>
          <label>Banner title <small>{{ form.home.heroTitle.length }}/32</small><input v-model.trim="form.home.heroTitle" maxlength="32" required :disabled="!canEditContent"></label>
          <label>Banner subtitle <small>{{ form.home.heroSubtitle.length }}/80</small><textarea v-model.trim="form.home.heroSubtitle" maxlength="80" rows="2" required :disabled="!canEditContent"></textarea></label>
          <label>Banner image <small>JPG, PNG, or WEBP · 1200×400–4096×4096 px · up to 8 MB</small><input type="file" accept="image/png,image/jpeg,image/webp" :disabled="uploadingHero || !canEditContent" @change="uploadHeroImage"></label>
          <img v-if="form.home.heroImageUrl" class="hero-preview" :src="form.home.heroImageUrl" alt="Banner preview">
          <button v-if="form.home.heroImageUrl" class="remove-image" type="button" :disabled="!canEditContent" @click="form.home.heroImageUrl = ''">Remove banner image</button>
          <label>Introductory statement <small>{{ form.home.statement.length }}/120</small><textarea v-model.trim="form.home.statement" maxlength="120" rows="3" required :disabled="!canEditContent"></textarea></label>
        </section>

        <section>
          <h2>Shop page</h2>
          <label>Description <small>{{ form.shop.description.length }}/450</small><textarea v-model.trim="form.shop.description" maxlength="450" rows="7" required :disabled="!canEditContent"></textarea></label>
        </section>

        <section>
          <h2>About Us</h2>
          <label>Title <small>{{ form.about.title.length }}/40</small><input v-model.trim="form.about.title" maxlength="40" required :disabled="!canEditContent"></label>
          <label>Image <small>JPG, PNG, or WEBP · 400×400–3000×3000 px · up to 5 MB</small><input type="file" accept="image/png,image/jpeg,image/webp" :disabled="uploading || !canEditContent" @change="uploadAboutImage"></label>
          <img v-if="form.about.imageUrl" class="image-preview" :src="form.about.imageUrl" :alt="form.about.imageAlt">
          <label>Image description<input v-model.trim="form.about.imageAlt" maxlength="120" required :disabled="!canEditContent"></label>
          <label>Text <small>{{ form.about.body.length }}/4000</small><textarea v-model.trim="form.about.body" maxlength="4000" rows="16" required :disabled="!canEditContent"></textarea></label>
        </section>

        <section>
          <h2>Footer and social media</h2>
          <p class="hint">You can enter up to three contact email addresses.</p>
          <label v-for="(_, index) in form.footer.emails" :key="index">Email {{ index + 1 }}<input v-model.trim="form.footer.emails[index]" type="email" maxlength="254" :disabled="!canEditContent"></label>
          <label>Facebook profile URL<input v-model.trim="form.footer.social.facebookUrl" type="url" placeholder="https://facebook.com/yourbrand" :disabled="!canEditContent"></label>
          <label>Instagram profile URL<input v-model.trim="form.footer.social.instagramUrl" type="url" placeholder="https://instagram.com/yourbrand" :disabled="!canEditContent"></label>
        </section>

        <div class="save-bar">
          <div class="workflow-copy">
            <strong>{{ versionStatus }}</strong>
            <small>Saving a draft does not change the live store.</small>
            <p v-if="message" class="success">{{ message }}</p>
            <p v-if="error" class="error">{{ error }}</p>
          </div>
          <div class="workflow-actions">
            <button :disabled="saving || publishing || loading || uploading || uploadingHero || !canEditContent">
              {{ canEditContent ? (saving ? 'Saving…' : 'Save draft') : 'Read only' }}
            </button>
            <button
              class="publish-button"
              type="button"
              :disabled="publishing || saving || loading || uploading || uploadingHero || hasLocalChanges || !hasUnpublishedChanges || !canEditContent"
              @click="publishContent"
            >
              {{ publishing ? 'Publishing…' : 'Publish draft to live store' }}
            </button>
          </div>
        </div>
      </form>
      <p v-else>Connect a Shopify store first.</p>
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
.permission-notice{grid-column:1/-1;margin:0;padding:.75rem 1rem;border-radius:8px;color:#7a2e0e;background:#fff4e5}.remove-image:disabled,input:disabled,textarea:disabled,button:disabled{cursor:not-allowed;opacity:.65}
.workflow-copy{display:grid;gap:.2rem;margin-right:auto}.workflow-copy>strong{color:#7a5710}.workflow-copy>small{color:#6a7683}.workflow-copy p{margin:.2rem 0 0}.workflow-actions{display:flex;gap:.75rem}.publish-button{background:#18794e!important}
@media(max-width:800px){.workflow-actions{display:grid;width:100%}}
</style>
