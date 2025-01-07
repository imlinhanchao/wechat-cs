<script lang="ts" setup>
import { nextTick, ref, watch } from 'vue';
// import Icon from '@/components/Icon';
import { useMessage } from '@/hooks/useMessage';

const props = defineProps<{
  contact: IContact;
}>();

const message = ref<string>('');

const { postMsg, invoke } = useMessage();

async function send() {
  if (!message.value) return;
  await postMsg('send', {
    id: props.contact.wxid,
    text: message.value,
    isRoom: props.contact.wxid.endsWith('@chatroom')
  });
  message.value = '';
}

const config = ref<any>({});
invoke('config').then((data) => {
  config.value = data;
});

const footerRef = ref();
watch(
  () => props.contact.msgs?.length,
  () => {
    refresh(props.contact);
  }
);

async function init(contact: IContact) {
  if (!contact.msgs?.length)
    await invoke('history', { id: props.contact.wxid, count: 100, index: 0 }).then((data) => {
      data.reverse();
      contact.msgs = data;
    });
  refresh(contact);
}

function refresh(contact: IContact) {
  nextTick(() => footerRef.value.scrollIntoView(true));
  contact.msgs.forEach((m) => {
    m.isReaded = true;
  });
}

defineExpose({ init, refresh });
</script>
<template>
  <el-container>
    <el-main class="!p-2" ref="mainRef">
      <section v-for="m in contact.msgs" :key="m.id" :class="{ 'font-bold': m.self }">
        <span class="text-[#12bc79]" v-if="contact.wxid.endsWith('@chatroom')">
          [{{ m.from.name }}]:
        </span>
        <span v-else-if="!m.from.self && m.type" class="text-[#1fd18b]">>&nbsp;</span>
        <span v-else-if="m.from.self && m.type" class="text-[#3b8eea]">&lt;&nbsp;</span>
        <span v-if="m.type == 'text'">{{ m.data }}</span>
        <img
          :src="`${config.server}/emoji?url=${encodeURIComponent(m.data)}`"
          v-if="m.type == 'emoji'"
          class="max-w-20px !inline"
        />
        <img
          :src="`${config.server}/emoji?url=${encodeURIComponent(m.data)}`"
          v-if="m.type == 'image'"
          class="max-w-20px !inline"
        />
      </section>
      <section ref="footerRef"></section>
    </el-main>
    <el-footer class="!p-0" height="auto">
      <el-input v-model="message" clearable @keydown.enter="send" autofocus>
        <template #prefix>
          <span class="text-[#29b8db] font-bold">{{ contact.nickname }}</span>
        </template>
      </el-input>
    </el-footer>
  </el-container>
</template>
