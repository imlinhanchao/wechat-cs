<script setup lang="ts">
import { useEventListener } from '@/hooks/useEventListener';
import { useMessage } from '@/hooks/useMessage';
import { ref } from 'vue';

const showContextMenu = ref(false);
const pos = ref({
  x: 0,
  y: 0
});

const msg = ref<any>();
defineExpose({
  show({ x, y }, m) {
    pos.value = { x, y };
    showContextMenu.value = true;
    msg.value = m;
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

const emit = defineEmits(['revoke']);
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
</script>

<template>
  <section
    class="absolute bg-[#1f1f1f] border-[#454545] border contextmenu p-1 rounded-lg"
    v-show="showContextMenu"
    ref="contextRef"
    :style="{ left: pos.x + 'px', top: pos.y + 'px' }"
  >
    <ul class="w-30">
      <li v-if="msg?.isSelf" @click="revoke">撤回</li>
      <li>引用</li>
      <li>复读一下</li>
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
