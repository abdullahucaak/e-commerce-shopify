import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from './views/LoginPage.vue'
import MfaPage from './views/MfaPage.vue'
import DashboardPage from './views/DashboardPage.vue'
import WorkspacesPage from './views/WorkspacesPage.vue'
import StoresPage from './views/StoresPage.vue'
import StoreDetailPage from './views/StoreDetailPage.vue'
import OperationsPage from './views/OperationsPage.vue'
import CatalogPage from './views/CatalogPage.vue'
import { useAdminAuthStore } from './stores/adminAuth.js'
import { pinia } from './stores/pinia.js'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/login', name: 'login', component: LoginPage },
    { path: '/mfa', name: 'mfa', component: MfaPage, meta: { requiresSession: true } },
    { path: '/dashboard', name: 'dashboard', component: DashboardPage, meta: { requiresAdmin: true } },
    { path: '/workspaces', name: 'workspaces', component: WorkspacesPage, meta: { requiresAdmin: true } },
    { path: '/stores', name: 'stores', component: StoresPage, meta: { requiresAdmin: true } },
    { path: '/stores/:storeId', name: 'store-detail', component: StoreDetailPage, meta: { requiresAdmin: true } },
    { path: '/operations', name: 'operations', component: OperationsPage, meta: { requiresAdmin: true } },
    { path: '/catalog', name: 'catalog', component: CatalogPage, meta: { requiresAdmin: true } }
  ]
})

router.beforeEach(async to => {
  const auth = useAdminAuthStore(pinia)
  try { await auth.initialize() } catch { await auth.signOut().catch(() => {}) }
  if ((to.meta.requiresSession || to.meta.requiresAdmin) && !auth.authenticated) return { name: 'login' }
  if (to.meta.requiresAdmin && auth.requiresMfa) return { name: 'mfa' }
  if (to.meta.requiresAdmin && !auth.authorized) return { name: 'login', query: { denied: '1' } }
  if (to.name === 'login' && auth.authorized) return { name: 'dashboard' }
  if (to.name === 'login' && auth.authenticated && auth.requiresMfa) return { name: 'mfa' }
})

export default router
