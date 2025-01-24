import 'element-plus/dist/index.css';
import 'virtual:windi.css';
import './assets/main.less';

import * as ElIcons from '@element-plus/icons-vue';
import ElementPlus from 'element-plus';
import { createApp } from 'vue';

import App from './App.vue';
import router from './router';
import { setupStore } from './store';

window.vscode =
  window.vscode || (window.acquireVsCodeApi ? window.acquireVsCodeApi() : window.parent);

console.log('loaded wechaty');

const app = createApp(App);

app.use(router);
app.use(ElementPlus);
for (const icon in ElIcons) {
  app.component(`ElIcon${icon}`, ElIcons[icon]);
}
setupStore(app);
app.mount('#app');

window.addEventListener('message', (event) => {
  const message = event.data;
  switch (message.command) {
    case 'style': {
      // 接受 iframe 父窗体转发的 VSCode html 注入的 style
      document.querySelector('html')!.setAttribute('style', message.data);
      break;
    }
  }
});
