import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../views/HomePage.vue'
import ShopPage from '../views/ShopPage.vue'
import ProductPage from '../views/ProductPage.vue'
import CartPage from '../views/CartPage.vue'
import Checkouts from '../views/Checkouts.vue'
import FinalPage from '../views/FinalPage.vue'
import CompletedOrders from '../views/cms/CompletedOrders.vue'
import LoginPage from '../views/cms/LoginPage.vue'
import Dashboard from '../views/cms/Dashboard.vue'
import Products from '../views/cms/Products.vue'
import OrderDetails from '../views/cms/OrderDetails.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage
    },
    {
      path: '/shop',
      name: 'shop',
      component: ShopPage
    },
    {
      path: '/products/:handle',
      name: 'product-page',
      component: ProductPage
    },
    {
      path: '/cart',
      name: 'cart',
      component: CartPage
    },
    {
      path: '/about-us',
      name: 'about-us',
      component: () => import('../views/AboutUs.vue')
    },
    {
      path: '/checkouts',
      name: 'checkouts',
      component: Checkouts
    },
    {
      path: '/final-page/:id',
      name: 'final-page',
      component: FinalPage
    },
    {
      path: '/cms/completed-orders',
      name: 'completed-orders',
      component: CompletedOrders,
      meta: { requiresAuth: true }
    },
    {
      path: '/cms/login',
      name: 'admin-login',
      component: LoginPage
    },
    {
      path: '/cms/dashboard',
      name: 'admin-dashboard',
      component: Dashboard,
      meta: { requiresAuth: true }
    },
    {
      path: '/cms/products',
      name: 'products',
      component: Products,
      meta: { requiresAuth: true }
    },
    {
      path: '/cms/order/:id',
      name: 'order-details',
      component: OrderDetails,
      meta: { requiresAuth: true }
    }
  ],
  /* To open the new page from the top. */
  scrollBehavior(to, from, savedPosition) {
    return { left: 0, top: 0 };
  }
})

// Navigation guard
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !localStorage.getItem('isAdmin')) {
    next('/cms/login')
  } else {
    next()
  }
})

export default router
