import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from './views/LoginPage.vue'
import DashboardPage from './views/DashboardPage.vue'
import DesignPage from './views/DesignPage.vue'
import DomainsPage from './views/DomainsPage.vue'
import AuthHandoffPage from './views/AuthHandoffPage.vue'
import ContentPage from './views/ContentPage.vue'
import ForgotPasswordPage from './views/ForgotPasswordPage.vue'
import UpdatePasswordPage from './views/UpdatePasswordPage.vue'
import { useAuthStore } from './stores/authStore'
import { pinia } from './stores/pinia'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/dashboard'
    },
    {
      path: '/auth/handoff',
      name: 'auth-handoff',
      component: AuthHandoffPage
    },
    {
      path: '/login',
      name: 'login',
      component: LoginPage,
      meta: { guestOnly: true }
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: ForgotPasswordPage,
      meta: { guestOnly: true }
    },
    {
      path: '/update-password',
      name: 'update-password',
      component: UpdatePasswordPage
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardPage,
      meta: { requiresAuth: true }
    },
    {
      path: '/design',
      name: 'design',
      component: DesignPage,
      meta: { requiresAuth: true }
    },
    {
      path: '/domains',
      name: 'domains',
      component: DomainsPage,
      meta: { requiresAuth: true }
    },
    {
      path: '/content',
      name: 'content',
      component: ContentPage,
      meta: { requiresAuth: true }
    }
  ]
})

router.beforeEach(async to => {
  const authStore = useAuthStore(pinia)

  try {
    await authStore.initialize()
  } catch (error) {
    console.error('Failed to initialize authentication:', error)
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return {
      name: 'login',
      query: { redirect: to.fullPath }
    }
  }

  if (to.meta.requiresAuth && typeof to.query.storefrontId === 'string') {
    authStore.selectStorefront(to.query.storefrontId)
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return { name: 'dashboard' }
  }
})

export default router
