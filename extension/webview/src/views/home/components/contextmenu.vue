<script setup lang="ts">
import { useEventListener } from '@/hooks/useEventListener';
import { useMessage } from '@/hooks/useMessage';
import { ElMessage } from 'element-plus';
import { ref, nextTick } from 'vue';

const showContextMenu = ref(false);
const pos = ref({
  x: 0,
  y: 0
});

const msg = ref<any>();
const contextRef = ref<HTMLElement>();
defineExpose({
  show({ x, y }, m) {
    msg.value = m;
    showContextMenu.value = true;
    nextTick(() => {
      const rect = contextRef.value!.getBoundingClientRect();
      const { width, height } = rect;
      if (x + width > window.innerWidth) x = x - width;
      if (y + height > window.innerHeight) y = window.innerHeight - height;
      pos.value = { x, y };
    });
  }
});

useEventListener({
  el: document.body,
  name: 'click',
  listener: (ev) => {
    const target: Element = ev.target as Element;
    if (target.closest('.contextmenu')) return;
    showContextMenu.value = false;
  }
});

const emit = defineEmits(['revoke', 'quote', 'doubleMsg', 'addEmoji']);
const { invoke } = useMessage();
async function revoke() {
  showContextMenu.value = false;
  await invoke('revoke', {
    id: msg.value.id
  }).then((data) => {
    if (data) {
      console.log('撤回成功');
      emit('revoke', msg.value.id);
    } else {
      console.log('撤回失败');
    }
  });
}
function quote() {
  showContextMenu.value = false;
  emit('quote', msg.value);
}
function doubleMsg() {
  showContextMenu.value = false;
  emit('doubleMsg', msg.value);
}
function addEmoji() {
  const emoji = typeof msg.value.data == 'string' ? JSON.parse(msg.value.data) : msg.value.data;
  invoke('addEmoji', emoji).then((data) => {
    if (!data) return;
    ElMessage.success('添加成功');
    emit('addEmoji', emoji);
  });
  showContextMenu.value = false;
}
</script>

<template>
  <section
    class="absolute bg-[#1f1f1f] border-[#454545] border contextmenu p-1 rounded-lg"
    v-show="showContextMenu"
    ref="contextRef"
    :style="{ left: pos.x + 'px', top: pos.y + 'px' }"
  >
    <ul class="w-30">
      <li v-if="msg?.type == 'emoji'" @click="addEmoji">添加表情包</li>
      <li v-if="msg?.isSelf" @click="revoke">撤回</li>
      <li v-if="['text', 'image', 'emoji'].includes(msg?.type)" @click="quote">引用</li>
      <li v-if="['text', 'emoji'].includes(msg?.type)" @click="doubleMsg">复读一下</li>
    </ul>
  </section>
</template>

<style lang="less" scoped>
ul {
  padding: 1px;
  li {
    padding: 2px 1em;
    border-radius: 5px;
    cursor: pointer;
    &:hover {
      background-color: #0078d4;
    }
  }
}
</style>
