<script setup lang="ts">
import { ref } from 'vue';
import Icon from '@/components/Icon';

defineProps<{
  nickname: string;
}>();
const message = ref<string>('');
const emit = defineEmits(['send']);

function sendImg() {}
</script>
<template>
  <section>
    <el-input v-model="message" clearable @keydown.enter="emit('send', message)" autofocus>
      <template #prefix>
        <span class="text-[#29b8db] font-bold">{{ nickname }}</span>
      </template>
      <template #append>
        <el-button @click="sendImg" link><Icon icon="majesticons:image-plus" /></el-button>
      </template>
    </el-input>
  </section>
</template>
