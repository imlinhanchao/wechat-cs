<script lang="ts" setup>
import { nextTick, ref, watch } from 'vue';
import { useMessage } from '@/hooks/useMessage';
import Msg from './components/msg.vue';
import MsgBox from './components/msgbox.vue';
import Contextmenu from './components/contextmenu.vue';

const props = defineProps<{
  contact: IContact;
  me?: string;
}>();

const { postMsg, invoke } = useMessage();

async function send(message, done) {
  if (!message) return;
  await postMsg('send', {
    id: props.contact.wxid,
    text: message,
    isRoom: props.contact.wxid.endsWith('@chatroom')
  });
  done();
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

function loadMsgs(contact: IContact, index = props.contact.msgs?.length) {
  return invoke('history', {
    id: props.contact.wxid,
    count: 100,
    index
  }).then((data) => {
    data.reverse();
    if (index) contact.msgs = data.concat(contact.msgs);
    else contact.msgs = data;
    refresh(contact);
  });
}

async function init(contact: IContact) {
  if ((contact.msgs?.length || 0) < 30) await loadMsgs(contact, 0);
  refresh(contact);
}

function refresh(contact: IContact) {
  nextTick(() => footerRef.value.scrollIntoView(true));
  contact.msgs?.forEach((m) => {
    m.isReaded = true;
  });
  postMsg('readed', { id: contact.wxid });
}

const contextRef = ref<InstanceType<typeof Contextmenu>>();
function contextmenu(ev, msg) {
  contextRef.value?.show(
    {
      x: ev.clientX,
      y: ev.clientY
    },
    {
      isSelf: msg.from.id == props.me,
      ...msg
    }
  );
}

const emit = defineEmits(['revoke']);

defineExpose({ init, refresh });
</script>
<template>
  <el-container>
    <el-main class="!p-2 relative" ref="mainRef">
      <section v-for="m in contact.msgs" :key="m.id" @contextmenu="contextmenu($event, m)">
        <template v-if="m.type != 'pat'">
          <span
            class="text-[#12bc79]"
            v-if="contact.wxid.endsWith('@chatroom')"
            :class="{ 'font-bold text-[#3b8eea]': m.from.id == me && m.type }"
          >
            [{{ m.from.alias || m.from.name }}]:
          </span>
          <span v-else-if="m.from.id != me && m.type" class="text-[#1fd18b]">>&nbsp;</span>
          <span v-else-if="m.from.id == me && m.type" class="text-[#3b8eea]">&lt;&nbsp;</span>
        </template>
        <span class="text-gray-700" v-if="m.isRevoke">[已撤回]&nbsp;</span>
        <Msg :msg="m" :config="config" />
      </section>
      <section ref="footerRef"></section>
      <!--消息结尾，用于滚动定位-->
      <Teleport to="body">
        <Contextmenu ref="contextRef" @revoke="emit('revoke', $event)" />
      </Teleport>
    </el-main>
    <el-footer class="!p-0" height="auto">
      <section class="flex items-center w-full">
        <el-button
          class="!text-[#1fd18b] !-mr-3 relative z-10"
          link
          icon="el-icon-refresh"
          @click="loadMsgs(contact, 0)"
        />
        <MsgBox :nickname="contact.nickname" @send="send" :wxid="contact.wxid" />
      </section>
    </el-footer>
  </el-container>
</template>
