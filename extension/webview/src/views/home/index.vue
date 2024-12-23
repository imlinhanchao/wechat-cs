<script setup lang="ts">
import { useMessage } from '@/hooks/useMessage';
import { computed, ref } from 'vue';
import ContactView from './contact.vue';

const { addListener, postMsg, invoke } = useMessage();
addListener('connect', (d: IMessage) => {
  console.log(d);
  if (d.isRoom) {
    const contact = contacts.value.find((c: IContact) => c.id === d.in.id);
    if (!contact) contacts.value.unshift(d.in);
  }
  const contactIndex = contacts.value.findIndex((c: IContact) => c.id === d.in.id);
  const contact = contacts.value.find((c: IContact) => c.id === d.in.id);
  if (contactIndex > 0) {
    contacts.value.unshift(contacts.value.splice(contactIndex, 1)[0]);
  }
  if (!contact) return;
  if (!contact.msgs) contact.msgs = [];
  contact.msgs.push(d);
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

const currentId = ref<string>();
const currentContact = computed(() => {
  return contacts.value.find((c: IContact) => c.id === currentId.value);
});
</script>

<template>
  <el-container>
    <el-aside class="border-r border-gray-800" width="200px">
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
              class="flex space-x-3 items-center py-1 px-1 border-b border-gray-800 cursor-pointer truncate"
              @click="currentId = c.id"
              :class="{ 'text-[#e5d815] font-bold': currentContact && currentContact.id === c.id }"
            >
              <!-- <el-avatar :size="16" :src="c.avatarUrl" /> -->
              <section class="truncate flex space-x-2">
                <span class="truncate">{{ c.alias || c.name }}</span>
                <span class="text-sm text-gray-700" v-if="c.alias && c.alias != c.name">
                  {{ c.name }}
                </span>
              </section>
            </section>
          </template>
        </el-main>
      </el-container>
    </el-aside>
    <el-main>
      <ContactView v-if="currentContact" :contact="currentContact" />
    </el-main>
  </el-container>
</template>
<style lang="less" scoped>
img {
  height: 1.5em;
  margin-right: 10px;
}
</style>
