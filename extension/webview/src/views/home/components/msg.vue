<script setup lang="ts">
import { computed } from 'vue';
import { fillEmoji } from '@/utils/emoji';
import { useConfigStore } from '@/store/modules/config';

const props = defineProps<{
  msg: IMessage;
}>();

const data = computed(() => {
  try {
    return ['quote', 'emoji'].includes(props.msg.type) && typeof props.msg.data == 'string'
      ? JSON.parse(props.msg.data)
      : props.msg.data;
  } catch (error) {
    return props.msg.data;
  }
});

const { getConfig: config } = useConfigStore();
</script>

<template>
  <section class="inline-flex" :data-type="msg.type">
    <span v-if="msg.type == 'text'">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <span v-html="fillEmoji(msg.data)"></span>
    </span>
    <el-image
      :src="`${config.server}/media?url=${encodeURIComponent(data.url)}`"
      v-else-if="msg.type == 'emoji'"
      class="max-w-20px !inline"
      lazy
    />
    <el-image
      :src="`${config.server}/media?url=${encodeURIComponent(msg.data)}`"
      v-else-if="msg.type == 'image'"
      class="max-w-20px !inline"
      lazy
    />
    <template v-else-if="msg.type == 'quote'">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <span v-html="fillEmoji(data.content)"></span> <br />
    </template>
    <template v-else-if="msg.type == 'pat'">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <span class="text-gray-600">{{ msg.data }}</span> <br />
    </template>
    <span v-else>[{{ msg.type }}消息]</span>
  </section>
  <template v-if="msg.type == 'quote'">
    <br />
    <span class="bg-dark-400 inline-block p-1 px-2 rounded text-gray-500 truncate max-w-[100%]">
      <b>[{{ data.refermsg?.displayname }}]:</b>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <span v-html="fillEmoji(data.refermsg?.content)"></span>
    </span>
  </template>
</template>
