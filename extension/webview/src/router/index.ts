import { createRouter, createMemoryHistory } from 'vue-router';
import HomeView from '../views/home/index.vue';
import LoginView from '../views/login/index.vue';

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
    }
  ]
});

export default router;
