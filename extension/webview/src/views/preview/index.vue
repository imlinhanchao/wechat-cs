<script setup lang="ts">
import { useMessage } from '@/hooks/useMessage';
import { ElImageViewer } from 'element-plus';
import { ref } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const images = ref((route.query.images as string).split(','));
const index = ref(Number(route.query.index || '0'));
const { postMsg, addListener } = useMessage();

const imgRef = ref<InstanceType<typeof ElImageViewer>>();
addListener('image', (data) => {
  const index = images.value.length;
  images.value.push(data);
  imgRef.value?.setActiveItem(index);
});
</script>
<template>
  <el-container>
    <el-image-viewer
      ref="imgRef"
      :url-list="images"
      @close="postMsg('close')"
      infinite
      :initial-index="index"
    />
  </el-container>
</template>
