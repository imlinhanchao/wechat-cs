// 完整示例
const {
  GeweBot
} = require("gewechaty");
const path = require('path');
const fs = require('fs');
const wss = require('./ws');
const { createRouter } = require('./api');

const WEGE_BASE_API_URL = `http://127.0.0.1:2531/v2/api`;
const WEGE_FILE_API_URL = `http://127.0.0.1:2532/download`;

const static = path.join(process.cwd(), 'static');
const imgStatic = path.join(static, 'img');
const fileStatic = path.join(static, 'file');

fs.mkdirSync(static, { recursive: true });
fs.mkdirSync(imgStatic, { recursive: true });
fs.mkdirSync(fileStatic, { recursive: true });

const bot = new GeweBot({
  debug: true, // 是否开启调试模式 默认false
  base_api: WEGE_BASE_API_URL, // Gewechat启动后的基础api地址base_api 默认为 `http://本机ip:2531/v2/api`
  file_api: WEGE_FILE_API_URL, // Gewechat启动后的文件api地址base_api 默认为 `http://本机ip:2532/download`,
  port: 3333, // 本地服务端口 默认3333,
  static: './static', // 静态资源目录 默认为当前目录下的static文件夹
});

// 监听消息事件
const onMessage = async (msg) => {
  let from = await msg.from();
  from = {
    alias: await from.alias(),
    avatarUrl: await from.avatar(),
    name: from.name(),
    type: from.type(),
    gender: from.gender(),
    province: from.province(),
    city: from.city(),
    self: from.self(),
    id: from._wxid 
  }
  let room = await msg.room();
  if (room) {
    room = {
      alias: room.name,
      avatarUrl: room.avatarImg,
      name: room.name,
      type: 2,
      id: room.chatroomId,
      room: { ...room },
    }
  }
  // 处理消息...
  const base = {
    id: msg._msgId,
    from,
    in: room || from,
    isRoom: !!room,
    self: await msg.self(),
    mentionSelf: await msg.mentionSelf(),
    date: msg.date(),
    age: msg.age(),
    source: msg.getXmlToJson?.(),
  }
  // 回复文本消息
  if (msg.type() === bot.Message.Type.Text) { //类型详见 MessageType 表
    //await msg.say("Hello, World!");
    wss.send({ type: bot.Message.Type.Text, data: msg.text(), ...base });
  }
  // 处理图片消息
  else if (msg.type() === bot.Message.Type.Image) {
    try {
      const filebox = await msg.toFileBox();
      const filePath = path.join(imgStatic, filebox.name);
      const fileUrl = `./img/${filebox.name}`;
      filebox.toFile(filePath);
      wss.send({ type: bot.Message.Type.Image, data: fileUrl, ...base });
    } catch(e) {
      wss.send({ type: bot.Message.Type.Image, data: `./default.jpg`, ...base });
    }
  }
  // 处理文件消息
  else if (msg.type() === bot.Message.Type.File) {
    const filebox = await msg.toFileBox();
    if (!filebox) {
      const data = bot.Message.getXmlToJson(msg.text());
      wss.send({ type: msg.type(), data, ...base });
      return;
    }
    const filePath = path.join(fileStatic, filebox.name);
    const fileUrl = `./file/${filebox.name}`;
    filebox.toFile(filePath);
    wss.send({ type: bot.Message.Type.File, data: fileUrl, ...base });
  }
  else if (msg.type() === bot.Message.Type.Emoji) {
    //await msg.say("收到表情");
    const data = bot.Message.getXmlToJson(msg.text());
    console.log(data.msg.emoji.cdnurl);
    wss.send({ type: bot.Message.Type.Emoji, data: data.msg.emoji.cdnurl, ...base });
  }
  else {
    const data = bot.Message.getXmlToJson(msg.text());
    wss.send({ type: msg.type(), data, ...base });
  }
};

bot.on("message", (msg) => {
  // 此处放回的msg为Message类型 可以使用Message类的方法
  onMessage(msg);
});


bot.on('all', msg => { // 如需额外的处理逻辑可以监听 all 事件 该事件将返回回调地址接收到的所有原始数据
  console.log('received all event.', msg)
})

bot
  .start()
  .then(async ({app, router}) => {
    createRouter(bot, router, wss) // 创建路由
    app.use(router.routes()).use(router.allowedMethods());
    
  })
  .catch((e) => {
    console.error(e);
  });