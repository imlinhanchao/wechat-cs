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
  console.info('route:', route);
});
</script>

<template>
  <el-container>
    <RouterView>
      <template #default="{ Component, route: r }">
        <KeepAlive>
          <component :is="Component" :key="r.fullPath" />
        </KeepAlive>
      </template>
    </RouterView>
  </el-container>
</template>

<style scoped></style>
