import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from './views/LoginPage.vue'
import DashboardPage from './views/DashboardPage.vue'
import DesignPage from './views/DesignPage.vue'
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
      path: '/login',
      name: 'login',
      component: LoginPage,
      meta: { guestOnly: true }
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

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return { name: 'dashboard' }
  }
})

export default router
