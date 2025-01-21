<script lang="ts" setup>
import { nextTick, ref, watch } from 'vue';
// import Icon from '@/components/Icon';
import { useMessage } from '@/hooks/useMessage';
import Msg from './components/msg.vue';
import MsgBox from './components/msgbox.vue';

const props = defineProps<{
  contact: IContact;
  me?: string;
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
  if ((contact.msgs?.length || 0) < 30)
    await invoke('history', { id: props.contact.wxid, count: 100, index: 0 }).then((data) => {
      data.reverse();
      contact.msgs = data;
    });
  refresh(contact);
}

function refresh(contact: IContact) {
  nextTick(() => footerRef.value.scrollIntoView(true));
  contact.msgs?.forEach((m) => {
    m.isReaded = true;
  });
}

defineExpose({ init, refresh });
</script>
<template>
  <el-container>
    <el-main class="!p-2" ref="mainRef">
      <section v-for="m in contact.msgs" :key="m.id">
        <span
          class="text-[#12bc79]"
          v-if="contact.wxid.endsWith('@chatroom')"
          :class="{ 'font-bold text-[#3b8eea]': m.from.id == me && m.type }"
        >
          [{{ m.from.name }}]:
        </span>
        <span v-else-if="m.from.id != me && m.type" class="text-[#1fd18b]">>&nbsp;</span>
        <span v-else-if="m.from.id == me && m.type" class="text-[#3b8eea]">&lt;&nbsp;</span>
        <Msg :msg="m" :config="config" />
      </section>
      <section ref="footerRef"></section>
    </el-main>
    <el-footer class="!p-0" height="auto">
      <MsgBox :nickname="contact.nickname" @send="send" />
    </el-footer>
  </el-container>
</template>
