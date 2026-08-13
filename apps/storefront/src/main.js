import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { applyStorefrontDesign } from './config/brand'
import { loadStorefrontRuntimeConfig } from './services/storefrontRuntime'

import './assets/base.css'

function enablePlatformDraftPreview() {
  if (!import.meta.env.DEV || window.top === window) return

  window.addEventListener('message', event => {
    const sourceUrl = new URL(event.origin)
    if (
      sourceUrl.hostname !== window.location.hostname ||
      event.data?.type !== 'glowfield:storefront-preview'
    ) return

    applyStorefrontDesign(event.data.settings || {})
  })

  window.parent.postMessage({ type: 'glowfield:storefront-preview-ready' }, '*')
}

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

  enablePlatformDraftPreview()

  const app = createApp(App)

  app.use(createPinia())
  app.use(router)

  app.mount('#app')
}

bootstrap()
