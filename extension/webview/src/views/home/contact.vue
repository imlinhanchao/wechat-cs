<script lang="ts" setup>
import Icon from '@/components/Icon';
import { computed, nextTick, ref, watch } from 'vue';
import { useMessage } from '@/hooks/useMessage';
import Msg from './components/msg.vue';
import MsgBox from './components/msgbox.vue';
import Contextmenu from './components/contextmenu.vue';
import { useConfigStore } from '@/store/modules/config';

const props = defineProps<{
  contact: IContact;
}>();

const { postMsg, invoke } = useMessage();
const { getMe: info } = useConfigStore();
const me = computed(() => info.wxid);

async function send(message, done) {
  if (!message || (atUser.value.length && !quoteMsg.value)) return;
  if (quoteMsg.value) {
    await invoke('quote', {
      id: props.contact.wxid,
      wxid: props.contact.wxid,
      title: message,
      msgid: quoteMsg.value.id,
      isRoom: props.contact.wxid.endsWith('@chatroom'),
      displayname: quoteMsg.value.from.alias || quoteMsg.value.from.name,
      content: quoteMsg.value.data
    });
    quoteMsg.value = null;
  } else {
    await invoke('send', {
      id: props.contact.wxid,
      text: message,
      isRoom: props.contact.wxid.endsWith('@chatroom'),
      ats: atUser.value.map((u) => u.id)
    });
    atUser.value = [];
  }
  done();
}

async function doubleMsg(msg) {
  if (msg.type == 'text') {
    await invoke('send', {
      id: props.contact.wxid,
      text: msg.data,
      isRoom: props.contact.wxid.endsWith('@chatroom')
    });
  } else if (msg.type == 'emoji') {
    const face = typeof msg.data == 'string' ? JSON.parse(msg.data) : msg.data;
    await invoke('sendEmoji', {
      ...face,
      id: props.contact.wxid
    });
  }
}

const msgboxRef = ref<InstanceType<typeof MsgBox>>();
function addEmoji(emoji) {
  msgboxRef.value?.addEmoji(emoji);
}

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
      isSelf: msg.from.id == me.value,
      ...msg
    }
  );
}

const emit = defineEmits(['revoke']);
const quoteMsg = ref<IMessage | null>();
function quote(msg: IMessage) {
  quoteMsg.value = msg;
}

const atUser = ref<IWechatContact[]>([]);
function atPush(user: IWechatContact) {
  atUser.value.push(user);
}

defineExpose({ init, refresh });
</script>
<template>
  <el-container>
    <el-main class="!p-2 relative" ref="mainRef">
      <section v-for="m in contact.msgs" :key="m.id" @contextmenu.prevent="contextmenu($event, m)">
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
        <Msg :msg="m" />
      </section>
      <section ref="footerRef"></section>
      <!--消息结尾，用于滚动定位-->
      <Teleport to="body">
        <Contextmenu
          ref="contextRef"
          @revoke="emit('revoke', $event)"
          @quote="quote"
          @double-msg="doubleMsg"
          @add-emoji="addEmoji"
          @at="atPush"
        />
      </Teleport>
    </el-main>
    <el-footer class="!p-0" height="auto">
      <section class="flex flex-col">
        <section class="flex items-center w-full">
          <el-button
            class="!text-[#1fd18b] relative z-10"
            link
            icon="el-icon-refresh"
            @click="loadMsgs(contact, 0)"
          />
          <MsgBox ref="msgboxRef" :nickname="contact.nickname" @send="send" :wxid="contact.wxid" />
        </section>
        <section>
          <el-tag
            type="info"
            v-if="quoteMsg"
            closable
            @close="quoteMsg = null"
            :hit="true"
            color="#1f1f1f"
            class="!border-[#3c3c3c] ml-1"
          >
            <Icon icon="gridicons:quote" />
            <span class="font-bold" v-if="contact.wxid.endsWith('@chatroom')">
              [{{ quoteMsg.from.alias || quoteMsg.from.name }}]:
            </span>
            <Msg :msg="quoteMsg" />
          </el-tag>
          <section v-else-if="atUser.length">
            <el-tag
              v-for="(u, i) in atUser"
              :key="u.id"
              type="info"
              closable
              @close="atUser.splice(i, 1)"
              :hit="true"
              color="#1f1f1f"
              class="!border-[#3c3c3c] ml-1"
            >
              <span class="font-bold" v-if="contact.wxid.endsWith('@chatroom')">
                @{{ u.alias || u.name }}
              </span>
            </el-tag>
          </section>
        </section>
      </section>
    </el-footer>
  </el-container>
</template>
