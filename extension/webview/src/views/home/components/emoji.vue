<script setup lang="ts">
import Icon from '@/components/Icon';
import { useEventListener } from '@/hooks/useEventListener';
import { defaultEmojis } from '@/utils/emoji';
import { ref } from 'vue';
const emit = defineEmits(['input']);

const visible = ref(false);

useEventListener({
  el: document.body,
  name: 'click',
  listener: (ev) => {
    const target: Element = ev.target as Element;
    if (target.closest('.emoji-list') || target.closest('.emoji-btn')) return;
    visible.value = false;
  }
});
</script>

<template>
  <Teleport to="body">
    <div
      v-show="visible"
      class="absolute right-2 top-2 bottom-2.5em overflow-auto bg-[#313131] rounded-lg p-[2px] emoji-list"
    >
      <section class="grid grid-cols-10 gap-[2px]">
        <div
          v-for="emoji in defaultEmojis"
          :key="emoji"
          @click="(emit('input', emoji), (visible = false))"
          class="flex items-center justify-center w-6 h-6 rounded bg-[#1f1f1f] cursor-pointer p-[3px]"
        >
          <img :src="`./emoji/${emoji}.png`" class="w-full h-full no-preview" />
        </div>
      </section>
    </div>
  </Teleport>
  <el-button type="primary" link @click="visible = !visible" class="emoji-btn">
    <Icon icon="mingcute:emoji-2-fill" class="text-[#dcdcaa]" />
  </el-button>
</template>
