<script setup lang="ts">
import { ref } from 'vue';
import Icon from '@/components/Icon';

defineProps<{
  nickname: string;
}>();
const message = ref<string>('');
const emit = defineEmits(['send', 'sendImg']);
</script>
<template>
  <section>
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
        <el-button type="primary" link @click="emit('sendImg')">
          <Icon icon="majesticons:image-plus" />
        </el-button>
      </template>
    </el-input>
  </section>
</template>
