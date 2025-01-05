const Bak = require('../interface/bak');
const Wechat = require('../interface/wechat');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

let rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.inputData = function (key, defaultVal) {
  return new Promise((resolve, reject) => {
      try {
          this.question(`${key}: ` + (defaultVal ? `[${defaultVal}]` : ''), function (val) {
              resolve(val || defaultVal);
          });
      } catch (error) {
          reject(error);
      }
  });
};

async function syncContact(save=true) {
  const configPath = path.join(__dirname, '..', 'config.json');
  const config = JSON.parse(fs.readFileSync(configPath).toString());
  if (!config.user || !config.passwd || !config.url) {
    console.log('请输入云朵备份账密');
    config.url = await rl.inputData('服务地址', config.url);
    config.user = await rl.inputData('用户名', config.user);
    config.passwd = await rl.inputData('密码', config.passwd);
    config.url = config.url.replace(/\/$/, '');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  }
  const bak = new Bak();
  console.log(await bak.loginWait);
  let page = 1, size = 100;
  console.info('开始同步联系人');
  const allContacts = [];
  let contacts = await bak.searchContact({ page, size });
  if (save) await Wechat.saveContacts(contacts.filter(contact => !contact.UserName.startsWith('gh_')));
  allContacts.push(...contacts);
  console.info('同步联系人', contacts.length, '条', '/ 第', page, '页');
  page++;
  while(contacts.length === size) {
    contacts = await bak.searchContact({ page, size });
    if (save) await Wechat.saveContacts(contacts.filter(contact => !contact.UserName.startsWith('gh_')));
    allContacts.push(...contacts);
    console.info('同步联系人', contacts.length, '条', '/ 第', page, '页');
    page++;
  }

  page = 1;
  size = 1000;
  console.info('开始同步群聊');
  const allChatrooms = [];
  let chatrooms = await bak.searchContact({ page, size, ChatRoomType: 2 });
  if (save) await Wechat.saveChatrooms(chatrooms);
  allChatrooms.push(...chatrooms);
  console.info('同步群聊', chatrooms.length, '条', '/ 第', page, '页');
  page++;
  while (chatrooms.length === size) {
    chatrooms = await bak.searchContact({ page, size, ChatRoomType: 2 });
    if (save) await Wechat.saveChatrooms(chatrooms);
    allChatrooms.push(...chatrooms);
    console.info('同步群聊', chatrooms.length, '条', '/ 第', page, '页');
    page++;
  }
  return allContacts;
}

// async function syncMessage(contacts) {
//   const bak = new Bak();
//   console.log(await bak.loginWait);
//   const allMessages = [];
//   for (let i = 0; i < contacts.length; i++) {
//     const contact = contacts[i];
//     let page = 1, size = 1000;
//     console.info(`开始同步`, contact.NickName, `消息${i}`);
//     let messages = await bak.getMessage({ strUsrName: contact.UserName, page, size }).then(m => m.msgs);
//     allMessages.push(...messages);
//     await Wechat.saveMessages(messages);
//     console.info('同步', contact.NickName, '消息', '/ 第', page, '页');
//     page++;
//     while (messages.length === size) {
//       messages = await bak.getMessage({ strUsrName: contact.UserName, page, size }).then(m => m.msgs);
//       allMessages.push(...messages);
//       await Wechat.saveMessages(messages);
//       console.info('同步', contact.NickName, '消息', '/ 第', page, '页');
//       page++;
//     }
//   }
//   return allMessages;
// }

async function main() {
  try {
    const contacts = await syncContact(true);
    fs.writeFileSync(
      path.join(__dirname, '..', 'contacts.json'), 
      JSON.stringify(contacts.map(c => c.UserName), null, 2)
    );
    console.log('同步完成');
  } catch (error) {
    throw error;
  }
}

main().then(console.log).catch(console.error);