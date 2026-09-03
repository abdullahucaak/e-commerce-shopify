import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router.js'
import './style.css'

if (window.location.hostname === 'staging.yourprostore.ai') {
  const robots = document.createElement('meta')
  robots.name = 'robots'
  robots.content = 'noindex,nofollow,noarchive'
  document.head.append(robots)
}

createApp(App).use(createPinia()).use(router).mount('#app')
