<script lang="ts" setup>
import { useMessage } from '@/hooks/useMessage';
import { computed, nextTick, onActivated, ref } from 'vue';
import ContactView from './contact.vue';
import Icon from '@/components/Icon';
import router from '@/router';
import { useConfigStore } from '@/store/modules/config';

const contactRef = ref<InstanceType<typeof ContactView>>();
const { addListener, postMsg, invoke } = useMessage();
addListener('connect', pushMsg);

function pushMsg(d: IMessage) {
  if (!d.type || d.in.id.startsWith('gh_')) return;
  if (d.type.toLocaleLowerCase() == 'revoke') {
    revokeMsg(d.data.id);
    return;
  }
  {
    if (!contacts.value.some((c: IContact) => c.wxid === d.in.id))
      contacts.value.unshift({
        id: d.in.id,
        wxid: d.in.id,
        avatar: d.in.avatarUrl,
        nickname: d.in.name,
        remark: d.in.alias,
        last_chat_time: Date.now(),
        msgs: []
      });
  }
  const contactIndex = contacts.value.findIndex((c: IContact) => c.wxid === d.in.id);
  let contact = contacts.value.find((c: IContact) => c.wxid === d.in.id);
  if (contactIndex > 0 && !blocks.value.includes(contact?.wxid || '')) {
    contacts.value.unshift(contacts.value.splice(contactIndex, 1)[0]);
  }
  contact = contactList.value.find((c: IContact) => c.wxid === d.in.id);
  if (!contact) return;
  if (!contact.msgs) contact.msgs = [];
  contact.msgs.push(d);
  if (currentId.value === contact.wxid) {
    contactRef.value?.refresh(contact);
  }
}

const configStore = useConfigStore();
const { getConfig: config } = configStore;
const info = computed(() => configStore.getMe);
const contacts = ref<IContact[]>([]);
const blocks = ref<string[]>(config.blocks || []);
addListener('blocks', (data) => {
  blocks.value = data;
});

function init() {
  postMsg('connect');
  invoke('contacts').then((data) => {
    if (!data) router.replace('/login');
    contacts.value = data || [];
  });
  invoke('history', {
    isReadable: false
  }).then((data) => {
    data.forEach(pushMsg);
  });
}

const currentId = ref<string>();
const currentContact = computed(() => {
  return contactList.value.find((c: IContact) => c.id === currentId.value);
});
function switchContact(id: string) {
  currentId.value = id;
  nextTick(() => {
    if (currentContact.value) contactRef.value?.init(currentContact.value);
  });
}

init();

onActivated(() => {
  init();
});

function revokeMsg(id) {
  for (let i = 0; i < contacts.value.length; i++) {
    const contact = contacts.value[i];
    if (contact.msgs) {
      for (let j = 0; j < contact.msgs.length; j++) {
        if (contact.msgs[j].id === id) {
          contact.msgs[j].isRevoke = true;
          return;
        }
      }
    }
  }
}

const search = ref('');
const searchResult = ref<IContact[]>([]);
const isSearching = ref(false);
function searchContact() {
  if (!search.value) return;
  invoke('contacts', { searchValue: search.value }).then((data) => {
    searchResult.value = data;
    isSearching.value = true;
  });
}

const contactList = computed(() => {
  return isSearching.value ? searchResult.value : contacts.value;
});
</script>

<template>
  <el-container>
    <el-aside class="border-r border-gray-800 p-1" width="200px">
      <el-container class="box-card">
        <el-header class="bg-gray-800 bg-opacity-50 !p-1" height="auto">
          <section class="flex justify-between items-center">
            <div v-if="info" class="flex space-x-1 items-center flex-nowarp whitespace-nowrap">
              <el-avatar :size="16" :src="info.smallHeadImgUrl" />
              <span class="font-bold">{{ info.nickName }}</span>
            </div>
            <el-button link icon="el-icon-search" @click="isSearching = !isSearching" />
          </section>
          <div v-if="isSearching">
            <el-input
              size="small"
              v-model="search"
              placeholder="搜索"
              clearable
              @keydown.enter="searchContact"
            />
          </div>
        </el-header>
        <el-main>
          <template v-for="c in contactList" :key="c.id">
            <section
              class="flex space-x-3 items-center py-1 px-1 border-b border-gray-800 cursor-pointer truncate group"
              @click="switchContact(c.id)"
              :class="{ 'text-[#e5d815] font-bold': currentContact && currentContact.id === c.id }"
            >
              <!-- <el-avatar :size="16" :src="c.avatarUrl" /> -->
              <section class="truncate flex space-x-2 justify-between w-full">
                <section class="truncate">
                  <span class="truncate">{{ c.remark || c.nickname }}</span>
                  <span
                    class="text-sm text-gray-700 ml-1"
                    v-if="c.remark && c.remark != c.nickname"
                  >
                    {{ c.nickname }}
                  </span>
                </section>
                <section class="flex space-x-2 items-center">
                  <Icon
                    :class="{ '!inline': blocks.includes(c.wxid) }"
                    class="text-gray-800 hidden group-hover:inline hover:text-gray-500"
                    icon="bxs:bell-off"
                    @click.stop="postMsg('block', c.wxid)"
                  />
                  <span
                    v-if="
                      c.msgs?.filter((m) => m.type && !m.isReaded).length &&
                      !blocks.includes(c.wxid)
                    "
                    class="bg-[#cd3131] inline-block px-1 text-black font-bold rounded-full text-xs"
                    >{{ c.msgs?.filter((m) => m.type && !m.isReaded).length || 0 }}</span
                  >
                </section>
              </section>
            </section>
          </template>
        </el-main>
      </el-container>
    </el-aside>
    <el-main>
      <ContactView
        ref="contactRef"
        v-if="currentContact"
        :contact="currentContact"
        :key="currentContact.wxid"
        @revoke="revokeMsg"
      />
    </el-main>
  </el-container>
</template>
<style lang="less" scoped>
img {
  height: 1.5em;
  margin-right: 10px;
}
</style>
