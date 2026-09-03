<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '../stores/authStore'

const authStore = useAuthStore()
const stores = computed(() => (authStore.workspace?.stores || []).filter(store => store.storefront))
const selectedStoreId = computed({
  get: () => authStore.selectedStoreId || stores.value[0]?.id || '',
  set: value => { authStore.selectedStoreId = value }
})
const selectedStore = computed(() => stores.value.find(store => store.id === selectedStoreId.value))
const versions = ref([])
const loading = ref(false)
const restoring = ref(null)
const message = ref('')
const error = ref('')

async function request(path, options = {}) {
  return fetch(path, {
    ...options,
    headers: { Accept: 'application/json', Authorization: `Bearer ${authStore.session.access_token}` }
  })
}

async function loadVersions() {
  const storefrontId = selectedStore.value?.storefront?.id
  versions.value = []
  message.value = ''
  error.value = ''
  if (!storefrontId) return
  loading.value = true
  try {
    const response = await request(`/api/storefronts/${storefrontId}/config-versions`)
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error)
    versions.value = payload.versions || []
  } catch {
    error.value = 'Version history could not be loaded.'
  } finally {
    loading.value = false
  }
}

async function restoreVersion(version) {
  if (!authStore.canRestoreConfig) return
  if (!window.confirm(`Prepare version ${version} as a new draft? The live store will not change.`)) return
  restoring.value = version
  message.value = ''
  error.value = ''
  try {
    const storefrontId = selectedStore.value.storefront.id
    const response = await request(
      `/api/storefronts/${storefrontId}/config-versions/${version}/restore`,
      { method: 'POST' }
    )
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error)
    const successMessage = payload.hasUnpublishedChanges
      ? `Version ${version} was prepared as draft version ${payload.draftVersion}. The live store did not change.`
      : 'The selected version already matches the live version; the pending draft was cleared.'
    await loadVersions()
    message.value = successMessage
  } catch {
    error.value = 'The version could not be restored as a draft.'
  } finally {
    restoring.value = null
  }
}

function formatDate(value) {
  return value ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'
}

watch(selectedStoreId, loadVersions)
onMounted(loadVersions)
</script>

<template>
  <div class="page-shell">
    <aside>
      <p class="wordmark">YourProStore.ai</p>
      <nav aria-label="Platform menu">
        <RouterLink to="/dashboard">Overview</RouterLink>
        <RouterLink to="/design">Design settings</RouterLink>
        <RouterLink to="/content">Content settings</RouterLink>
        <RouterLink to="/domains">Domain settings</RouterLink>
        <RouterLink to="/versions">Version history</RouterLink>
      </nav>
    </aside>
    <main>
      <header>
        <div><p class="eyebrow">Safe rollback</p><h1>Version history</h1></div>
        <select v-model="selectedStoreId" aria-label="Select store">
          <option v-for="store in stores" :key="store.id" :value="store.id">{{ store.name }}</option>
        </select>
      </header>
      <p class="hint">Restoring does not change the live store. The selected settings become a new draft and must be published separately from the Design or Content page.</p>
      <p v-if="message" class="success">{{ message }}</p>
      <p v-if="error" class="error">{{ error }}</p>
      <section>
        <p v-if="loading">Loading versions…</p>
        <p v-else-if="!versions.length">No configuration versions yet.</p>
        <table v-else>
          <thead><tr><th>Version</th><th>Status</th><th>Changed by</th><th>Date</th><th></th></tr></thead>
          <tbody>
            <tr v-for="item in versions" :key="item.version">
              <td><strong>#{{ item.version }}</strong></td>
              <td><span class="status" :class="item.status">{{ item.status }}</span></td>
              <td>{{ item.createdByName || 'Unknown' }}</td>
              <td>{{ formatDate(item.publishedAt || item.updatedAt || item.createdAt) }}</td>
              <td><button v-if="item.status !== 'draft'" :disabled="!authStore.canRestoreConfig || restoring !== null" @click="restoreVersion(item.version)">{{ restoring === item.version ? 'Preparing…' : 'Restore as draft' }}</button></td>
            </tr>
          </tbody>
        </table>
        <p v-if="!authStore.canRestoreConfig" class="permission">Only workspace owners and admins can restore a version.</p>
      </section>
    </main>
  </div>
</template>

<style scoped>
.page-shell{display:grid;grid-template-columns:250px 1fr;min-height:100vh;background:#f5f7f9}aside{display:flex;flex-direction:column;gap:3rem;padding:2rem 1.5rem;color:#fff;background:#202934}.wordmark{margin:0;font-size:1.55rem;font-weight:750}nav{display:grid;gap:.5rem}nav a{padding:.8rem .9rem;border-radius:9px;color:#fff;text-decoration:none}.router-link-active{background:#ffffff1f}main{padding:2.5rem}header{display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem}.eyebrow{margin:0;color:#6a7683;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em}h1{margin:.35rem 0;color:#202934}.hint{max-width:760px;color:#66727d}section{margin-top:1.5rem;padding:1.5rem;border:1px solid #e2e7eb;border-radius:14px;background:#fff;overflow:auto}table{width:100%;border-collapse:collapse}th,td{padding:.9rem;text-align:left;border-bottom:1px solid #e8ecef}th{color:#6a7683;font-size:.75rem;text-transform:uppercase}.status{padding:.25rem .55rem;border-radius:999px;background:#eef1f4}.status.published{color:#18794e;background:#e8f6ef}.status.draft{color:#9a6700;background:#fff4ce}button,select{padding:.65rem .8rem;border:1px solid #d8dee4;border-radius:8px;background:#fff}button{cursor:pointer}.success{color:#18794e}.error{color:#b42318}.permission{color:#8a5b00}@media(max-width:800px){.page-shell{grid-template-columns:1fr}aside{padding:1rem;gap:1rem}main{padding:1.25rem}header{align-items:flex-start;gap:1rem;flex-direction:column}}
</style>
