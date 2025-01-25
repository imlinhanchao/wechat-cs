<script setup lang="ts">
import Icon from '@/components/Icon';
import { useEventListener } from '@/hooks/useEventListener';
import { getEmojiList } from '@/utils/emoji';
import { ref } from 'vue';

const emit = defineEmits(['send']);
const visible = ref(false);

useEventListener({
  el: document.body,
  name: 'click',
  listener: (ev) => {
    const target: Element = ev.target as Element;
    if (target.closest('.face-list') || target.closest('.face-btn')) return;
    visible.value = false;
  }
});

const emojis = ref<IEmoji[]>([]);
getEmojiList().then((data) => {
  emojis.value = data;
});

function send(emoji: any) {
  emit('send', emoji);
  visible.value = false;
}

defineExpose({
  add(emoji) {
    emojis.value.unshift(emoji);
  }
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="absolute right-2 top-2 bottom-2.5em overflow-auto bg-[#313131] rounded-lg p-[2px] face-list"
      style=""
    >
      <section class="grid grid-cols-6 gap-[2px]">
        <div
          v-for="emoji in emojis"
          :key="emoji.md5"
          @click="send(emoji)"
          class="flex items-center justify-center w-12 h-12 rounded bg-[#1f1f1f] cursor-pointer p-[3px]"
        >
          <el-image
            :src="`./emoji/face_${emoji.md5}`"
            class="w-full h-full no-preview"
            loading="lazy"
            fit="cover"
          >
            <template #error>
              <section class="flex items-center justify-center w-full h-full">
                <Icon icon="line-md:loading-loop" />
              </section>
            </template>
          </el-image>
        </div>
      </section>
    </div>
  </Teleport>
  <el-button type="success" link @click="visible = !visible" class="face-btn">
    <Icon icon="fluent:emoji-meme-24-regular" />
  </el-button>
</template>
