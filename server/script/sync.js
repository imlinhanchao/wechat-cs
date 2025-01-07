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
  await bak.loginWait;
  let page = 1, size = 100;
  console.info('开始同步联系人');
  const allContacts = [];
  let contacts = await bak.searchContact({ page, size });
  if (save) await Wechat.saveContacts(contacts.filter(contact => !contact.UserName.startsWith('gh_')));
  allContacts.push(...contacts.filter(contact => !contact.UserName.startsWith('gh_')));
  console.info('同步联系人', contacts.length, '条', '/ 第', page, '页');
  page++;
  while(contacts.length === size) {
    contacts = await bak.searchContact({ page, size });
    if (save) await Wechat.saveContacts(contacts.filter(contact => !contact.UserName.startsWith('gh_')));
    allContacts.push(...contacts.filter(contact => !contact.UserName.startsWith('gh_')));
    console.info('同步联系人', contacts.length, '条', '/ 第', page, '页');
    page++;
  }

  page = 1;
  size = 1000;
  console.info('开始同步群聊');
  let chatrooms = await bak.searchContact({ page, size, ChatRoomType: 2 });
  if (save) await Wechat.saveChatrooms(chatrooms);
  allContacts.push(...chatrooms);
  console.info('同步群聊', chatrooms.length, '条', '/ 第', page, '页');
  page++;
  while (chatrooms.length === size) {
    chatrooms = await bak.searchContact({ page, size, ChatRoomType: 2 });
    if (save) await Wechat.saveChatrooms(chatrooms);
    allContacts.push(...chatrooms);
    console.info('同步群聊', chatrooms.length, '条', '/ 第', page, '页');
    page++;
  }
  return allContacts;
}

async function syncMessage(contacts) {
  const bak = new Bak();
  console.log(await bak.loginWait);
  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    const user = contact.UserName || contact.wxid;
    const nick = contact.NickName || contact.Remark || contact.nickname ;
    let page = 1, size = 500;
    console.info(`开始同步`, nick, `消息${i}`);
    let messages = await bak.getMessage({ strUsrName: user, page, size }).then(m => m.msgs);
    await Wechat.saveMessagesFromBak(messages, user, nick);
    console.info('同步', nick, '消息', '/ 第', page, '页');
  }
}

async function main() {
  try {
    const contacts = await syncContact(true);
    fs.writeFileSync(
      path.join(__dirname, '..', 'contacts.json'), 
      JSON.stringify(contacts.map(c => c.UserName), null, 2)
    );
    await syncMessage(contacts);
    console.log('同步完成');
    process.exit(0);
  } catch (error) {
    throw error;
  }
}

main().catch(console.error);