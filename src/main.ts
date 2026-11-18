import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { rejimStore } from './stores/rejim'

// Biznes rejimi (distributsiya | optom) menyu va yo'naltirishdan oldin aniq bo'lishi kerak
rejimStore.yukla().finally(() => {
  createApp(App).use(router).mount('#app')
})
