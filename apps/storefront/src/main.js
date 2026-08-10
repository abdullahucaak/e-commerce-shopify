import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { applyStorefrontDesign } from './config/brand'
import { loadStorefrontRuntimeConfig } from './services/storefrontRuntime'

import './assets/base.css'

async function bootstrap() {
  try {
    const runtimeConfig = await loadStorefrontRuntimeConfig()
    applyStorefrontDesign({
      ...runtimeConfig.design,
      brand: {
        name: runtimeConfig.storefront.name,
        ...(runtimeConfig.design.brand || {})
      }
    })
    document.title = runtimeConfig.design?.brand?.name || runtimeConfig.storefront.name
  } catch (error) {
    console.error('Failed to initialize storefront configuration:', error)
  }

  const app = createApp(App)

  app.use(createPinia())
  app.use(router)

  app.mount('#app')
}

bootstrap()
