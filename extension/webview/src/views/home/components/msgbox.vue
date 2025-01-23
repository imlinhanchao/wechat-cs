<script setup lang="ts">
import { ref } from 'vue';
import Icon from '@/components/Icon';
import { useMessage } from '@/hooks/useMessage';
import { useEventListener } from '@/hooks/useEventListener';
import Emoji from './emoji.vue';

const props = defineProps<{
  nickname: string;
  wxid: string;
}>();
const message = ref<string>('');
const emit = defineEmits(['send', 'sendImg']);
const { invoke } = useMessage();

const imgLoading = ref(false);
async function sendImg() {
  imgLoading.value = true;
  invoke('sendImg', {
    id: props.wxid
  }).finally(() => {
    imgLoading.value = false;
  });
}

useEventListener({
  el: document,
  name: 'paste',
  listener: () => {
    imgLoading.value = true;
    invoke('pasteAndSend', {
      id: props.wxid
    }).finally(() => {
      imgLoading.value = false;
    });
  }
});
</script>
<template>
  <section class="flex-1">
    <el-input
      v-model="message"
      clearable
      @keydown.enter="emit('send', message, () => (message = ''))"
      autofocus
    >
      <template #prefix>
        <span class="text-[#29b8db] font-bold">{{ nickname }}</span>
      </template>
      <template #suffix>
        <section class="flex items-center space-x-0">
          <el-button type="primary" link @click="sendImg" :loading="imgLoading">
            <Icon icon="majesticons:image-plus" v-if="!imgLoading" />
          </el-button>
          <Emoji @input="message += `[${$event}]`" />
        </section>
      </template>
    </el-input>
  </section>
</template>
