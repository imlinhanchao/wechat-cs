<script setup lang="ts">
import { useMessage } from '@/hooks/useMessage';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

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
</script>

<template>
  <el-container>
    <div class="login-link">
      <el-input v-model="code" placeholder="登录验证码" />
      <a href="#" @click="login">登录</a>
    </div>
  </el-container>
</template>
<style lang="less" scoped></style>
