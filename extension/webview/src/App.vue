<script setup lang="ts">
import { RouterView, useRoute, useRouter } from 'vue-router';
import { useMessage } from '@/hooks/useMessage';
import { onMounted } from 'vue';

const router = useRouter();
const { addListener, postMsg, invoke } = useMessage();
addListener('path', (data) => {
  router.push(data);
});
postMsg('ready');

const route = useRoute();
onMounted(async () => {
  if (route.name != 'login' && (await invoke('isLogin')) === false) {
    router.push('/login');
  }
});
</script>

<template>
  <RouterView />
</template>

<style scoped></style>
