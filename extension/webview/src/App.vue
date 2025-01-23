<script setup lang="ts">
import { RouterView, useRoute, useRouter } from 'vue-router';
import { useMessage } from '@/hooks/useMessage';
import { onMounted } from 'vue';
import { useEventListener } from './hooks/useEventListener';

const router = useRouter();
const { addListener, postMsg, invoke } = useMessage();
addListener('path', (data) => {
  router.push(data);
});
postMsg('ready');

const route = useRoute();
onMounted(async () => {
  const isLogin = await invoke('isLogin');
  if (route.name != 'login' && !isLogin) {
    router.push('/login');
  }
  console.info('route:', route);
});
useEventListener({
  el: document.body,
  name: 'click',
  listener: (e) => {
    const target = e.target as HTMLElement;
    if (
      target.nodeName.toLowerCase() == 'img' &&
      !Array.from(target.classList).includes('no-preview')
    ) {
      postMsg('preview', { images: [(target as HTMLImageElement).src] });
    }
  }
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
