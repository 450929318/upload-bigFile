import { createRouter, createWebHashHistory } from 'vue-router'
import Index from '../views/index'

const routes = [
  {
    path: '/',
    name: 'Index',
    component: Index
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
