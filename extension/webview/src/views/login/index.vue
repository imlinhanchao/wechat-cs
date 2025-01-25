<script setup lang="ts">
import { useMessage } from '@/hooks/useMessage';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import Icon from '@/components/Icon';
import { ElInput } from 'element-plus';

const router = useRouter();
const code = ref('');
function login() {
  const { invoke } = useMessage();
  invoke('login', code.value).then((data) => {
    if (data) router.replace('/');
  });
}

const isLogin = ref(false);
const { invoke } = useMessage();

function getIsLogin() {
  invoke('isLogin').then((data) => {
    isLogin.value = data;
    if (data) router.replace('/');
  });
}

getIsLogin();

const codeRef = ref<InstanceType<typeof ElInput>>();
onMounted(() => {
  codeRef.value?.focus();
});
</script>

<template>
  <el-container>
    <section class="flex items-center justify-center h-full w-full">
      <el-input
        ref="codeRef"
        v-model="code"
        placeholder="登录验证码"
        @keydown.enter="login"
        autofocus
        maxlength="6"
        class="w-50"
      >
        <template #prefix> <Icon icon="si:lock-fill" /></template>
      </el-input>
    </section>
  </el-container>
</template>
<style lang="less" scoped></style>
