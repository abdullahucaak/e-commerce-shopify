import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from './views/LoginPage.vue'
import HomePage from './views/HomePage.vue'
import StoresPage from './views/StoresPage.vue'
import SetupPage from './views/SetupPage.vue'
import { useAccountStore } from './stores/account.js'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomePage, name: 'home' },
    { path: '/login', component: LoginPage, name: 'login' },
    { path: '/stores', component: StoresPage, meta: { auth: true } },
    { path: '/setup/:storefrontId', component: SetupPage, meta: { auth: true } }
  ]
})

router.beforeEach(async to => {
  const account = useAccountStore()
  await account.initialize()
  if (to.meta.auth && !account.authenticated) return { name: 'login' }
  if (to.name === 'login' && account.authenticated) return '/stores'
})

export default router
