<script setup lang="ts">
defineProps<{
  msg: IMessage;
  config: any;
}>();
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
    <span v-else>[{{ msg.type }}消息]</span>
  </section>
</template>
