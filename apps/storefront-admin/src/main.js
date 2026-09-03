import { createApp } from 'vue'

import App from './App.vue'
import router from './router'
import { pinia } from './stores/pinia'
import './assets/base.css'

if (window.location.hostname === 'manage-staging.yourprostore.ai') {
  const robots = document.createElement('meta')
  robots.name = 'robots'
  robots.content = 'noindex,nofollow,noarchive'
  document.head.append(robots)
}

createApp(App)
  .use(pinia)
  .use(router)
  .mount('#app')
