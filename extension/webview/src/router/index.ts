import { createRouter, createMemoryHistory } from 'vue-router';
import HomeView from '../views/home/index.vue';
import LoginView from '../views/login/index.vue';
import PreviewView from '../views/preview/index.vue';

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/preview',
      name: 'preview',
      component: PreviewView
    }
  ]
});

export default router;
