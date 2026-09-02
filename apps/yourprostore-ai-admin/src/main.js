import { createApp } from 'vue'
import App from './App.vue'
import router from './router.js'
import { pinia } from './stores/pinia.js'
import './style.css'
import './font.css'
import './theme.css'

createApp(App).use(pinia).use(router).mount('#app')
