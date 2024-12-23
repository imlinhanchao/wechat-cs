<script lang="ts" setup>
import { ref } from 'vue';
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
    id: props.contact.id,
    text: message.value,
    isRoom: props.contact.isRoom
  });
  message.value = '';
}

const config = ref<any>({});
invoke('config').then((data) => {
  config.value = data;
});
</script>
<template>
  <el-container>
    <el-main class="!px-2">
      <section v-for="m in contact.msgs" :key="m.id" :class="{ 'font-bold': m.self }">
        <span class="text-[#12bc79]" v-if="contact.id.endsWith('@chatroom')">
          [{{ m.from.alias }}]:
        </span>
        <span v-if="m.type == 'text'">{{ m.data }}</span>
        <img
          :src="`${config.server}/emoji?url=${encodeURIComponent(m.data)}`"
          v-if="m.type == 'emoji'"
          class="max-w-20px"
        />
      </section>
    </el-main>
    <el-footer class="!p-0" height="auto">
      <el-input v-model="message" clearable @key-down.enter="send" autofocus>
        <template #prefix>
          <span class="text-[#29b8db] font-bold">{{ contact.alias }}</span>
        </template>
      </el-input>
    </el-footer>
  </el-container>
</template>
