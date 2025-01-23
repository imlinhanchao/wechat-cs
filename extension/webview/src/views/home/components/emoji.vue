<script setup lang="ts">
import Icon from '@/components/Icon';
import { defaultEmojis } from '@/utils/emoji';
import { ref } from 'vue';
const emit = defineEmits(['input']);

const visible = ref(false);
</script>

<template>
  <Teleport to="body">
    <div v-show="visible" class="absolute right-2 left-60% top-2 bottom-3em overflow-auto">
      <section class="grid grid-cols-7 gap-1">
        <div
          v-for="emoji in defaultEmojis"
          :key="emoji"
          @click="(emit('input', emoji), (visible = false))"
          class="flex items-center justify-center w-10 h-10 rounded-lg bg-[#1f1f1f] cursor-pointer"
        >
          <img :src="`./emoji/${emoji}.png`" class="w-6 h-6 no-preview" />
        </div>
      </section>
    </div>
  </Teleport>
  <el-button type="primary" link @click="visible = !visible">
    <Icon icon="mingcute:emoji-2-fill" class="text-[#dcdcaa]" />
  </el-button>
</template>
