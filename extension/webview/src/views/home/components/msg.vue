<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  msg: IMessage;
  config: any;
}>();

const data = computed(() => {
  return props.msg.type == 'quote' && typeof props.msg.data == 'string'
    ? JSON.parse(props.msg.data)
    : props.msg.data;
});
</script>

<template>
  <section class="inline-flex" :data-type="msg.type">
    <span v-if="msg.type == 'text'">{{ msg.data }}</span>
    <img
      :src="`${config.server}/emoji?url=${encodeURIComponent(msg.data)}`"
      v-else-if="msg.type == 'emoji'"
      class="max-w-20px !inline"
    />
    <img
      :src="`${config.server}/emoji?url=${encodeURIComponent(msg.data)}`"
      v-else-if="msg.type == 'image'"
      class="max-w-20px !inline"
    />
    <template v-else-if="msg.type == 'quote'">
      <span>{{ data.content }}</span> <br />
    </template>
    <span v-else>[{{ msg.type }}消息]</span>
  </section>
  <template v-if="msg.type == 'quote'">
    <br />
    <span class="bg-dark-400 inline-block p-1 px-2 rounded text-gray-500 truncate max-w-[100%]"
      >[{{ data.refermsg?.displayname }}]: {{ data.refermsg?.content }}</span
    >
  </template>
</template>
