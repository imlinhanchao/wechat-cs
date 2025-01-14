<script lang="ts" setup>
import { useMessage } from '@/hooks/useMessage';
import { computed, nextTick, ref } from 'vue';
import ContactView from './contact.vue';
import Icon from '@/components/Icon';

const contactRef = ref<InstanceType<typeof ContactView>>();
const { addListener, postMsg, invoke } = useMessage();
addListener('connect', (d: IMessage) => {
  if (!d.type) return;
  {
    const contact = contacts.value.find((c: IContact) => c.wxid === d.in.id);
    if (!contact)
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
  const contact = contacts.value.find((c: IContact) => c.wxid === d.in.id);
  if (contactIndex > 0 && !blocks.value.includes(contact?.wxid || '')) {
    contacts.value.unshift(contacts.value.splice(contactIndex, 1)[0]);
  }
  if (!contact) return;
  if (!contact.msgs) contact.msgs = [];
  contact.msgs.push(d);
  if (currentId.value === contact.wxid) {
    contactRef.value?.refresh(contact);
  }
});
postMsg('connect');

const info = ref<IUser>();
invoke('info').then((data) => {
  info.value = data;
});

const contacts = ref<IContact[]>([]);
invoke('contacts').then((data) => {
  contacts.value = data;
});

const blocks = ref<string[]>([]);
invoke('blocks').then((data) => {
  blocks.value = data;
});
addListener('blocks', (data) => {
  blocks.value = data;
});

const currentId = ref<string>();
const currentContact = computed(() => {
  return contacts.value.find((c: IContact) => c.id === currentId.value);
});
function switchContact(id: string) {
  currentId.value = id;
  nextTick(() => {
    if (currentContact.value) contactRef.value?.init(currentContact.value);
  });
}
</script>

<template>
  <el-container>
    <el-aside class="border-r border-gray-800 p-1" width="200px">
      <el-container class="box-card">
        <el-header class="bg-gray-800 bg-opacity-50 !p-1" height="auto">
          <div v-if="info" class="flex space-x-3 items-center">
            <el-avatar :size="16" :src="info.smallHeadImgUrl" />
            <span class="font-bold">{{ info.nickName }}</span>
          </div>
        </el-header>
        <el-main>
          <template v-for="c in contacts" :key="c.id">
            <section
              class="flex space-x-3 items-center py-1 px-1 border-b border-gray-800 cursor-pointer truncate group"
              @click="switchContact(c.id)"
              :class="{ 'text-[#e5d815] font-bold': currentContact && currentContact.id === c.id }"
            >
              <!-- <el-avatar :size="16" :src="c.avatarUrl" /> -->
              <section class="truncate flex space-x-2 justify-between w-full">
                <section class="truncate">
                  <span class="truncate">{{ c.remark || c.nickname }}</span>
                  <span class="text-sm text-gray-700" v-if="c.remark && c.remark != c.nickname">
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
