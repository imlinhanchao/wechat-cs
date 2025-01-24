<script setup lang="ts">
import { RouterView, useRoute, useRouter } from 'vue-router';
import { useMessage } from '@/hooks/useMessage';
import { useEventListener } from './hooks/useEventListener';
import { useConfigStore } from './store/modules/config';
import { ref, nextTick } from 'vue';

const router = useRouter();
const { addListener, postMsg, invoke } = useMessage();
addListener('path', (data) => {
  console.info('path:', data);
  if (data.startsWith('/preview')) {
    nextTick(() => router.push(data));
    isInited.value = true;
  }
  router.push(data);
});
postMsg('ready');

const { loginInit } = useConfigStore();
const route = useRoute();
const isInited = ref(false);
const init = async () => {
  isInited.value = false;
  const isLogin = await invoke('isLogin');
  if (route.name != 'login' && !isLogin) {
    router.push('/login');
  } else if (isLogin) {
    await loginInit();
  }
  console.info('route:', route);
  isInited.value = true;
};

init();

useEventListener({
  el: document.body,
  name: 'click',
  listener: (e) => {
    const target = e.target as HTMLElement;
    if (target.nodeName.toLowerCase() == 'img' && !target.closest('.no-preview')) {
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
          <component :is="Component" :key="r.fullPath" v-if="isInited" />
        </KeepAlive>
      </template>
    </RouterView>
  </el-container>
</template>

<style scoped></style>
