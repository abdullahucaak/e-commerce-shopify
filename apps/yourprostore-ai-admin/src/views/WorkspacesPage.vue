<script setup>
import { onMounted, ref } from 'vue'
import { useAdminAuthStore } from '../stores/adminAuth.js'
import { fetchPlatformWorkspaces } from '../services/adminSession.js'

const auth = useAdminAuthStore()
const result = ref({ items: [], page: 1, pageSize: 25, total: 0 })
const loading = ref(true)
const error = ref('')

async function load(page = 1) {
  loading.value = true
  error.value = ''
  try {
    result.value = await fetchPlatformWorkspaces({
      apiUrl: import.meta.env.VITE_API_URL || '',
      accessToken: auth.session.access_token,
      page,
      pageSize: result.value.pageSize
    })
  } catch {
    error.value = 'Workspace listesi yüklenemedi.'
  } finally {
    loading.value = false
  }
}

function formatDate(value) {
  return value ? new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(new Date(value)) : '—'
}

onMounted(() => load())
</script>

<template>
  <main class="dashboard">
    <header>
      <div><div class="eyebrow">PLATFORM MÜŞTERİLERİ</div><h1>Workspace’ler</h1></div>
      <RouterLink class="button-link secondary" to="/dashboard">Genel duruma dön</RouterLink>
    </header>
    <p class="muted">Yalnız operasyon için gereken sahiplik ve mağaza özetleri gösterilir.</p>
    <p v-if="error" class="notice">{{ error }}</p>
    <section class="panel table-panel">
      <p v-if="loading" class="muted">Yükleniyor…</p>
      <div v-else class="table-scroll">
        <table>
          <thead><tr><th>Workspace</th><th>Sahip</th><th>Üye</th><th>Mağaza</th><th>Oluşturulma</th></tr></thead>
          <tbody>
            <tr v-for="workspace in result.items" :key="workspace.id">
              <td><strong>{{ workspace.name }}</strong><small>{{ workspace.id }}</small></td>
              <td>{{ workspace.ownerEmail || '—' }}</td>
              <td>{{ workspace.memberCount }}</td>
              <td>{{ workspace.storeCount }}</td>
              <td>{{ formatDate(workspace.createdAt) }}</td>
            </tr>
            <tr v-if="!result.items.length"><td colspan="5" class="empty">Workspace bulunamadı.</td></tr>
          </tbody>
        </table>
      </div>
    </section>
    <nav v-if="result.total > result.pageSize" class="pagination" aria-label="Sayfalama">
      <button class="secondary" :disabled="loading || result.page <= 1" @click="load(result.page - 1)">Önceki</button>
      <span>Sayfa {{ result.page }} · Toplam {{ result.total }}</span>
      <button class="secondary" :disabled="loading || result.page * result.pageSize >= result.total" @click="load(result.page + 1)">Sonraki</button>
    </nav>
  </main>
</template>
