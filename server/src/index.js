// 完整示例
const {
  GeweBot
} = require("gewechaty");
const path = require('path');
const fs = require('fs');
const wss = require('./ws');
const { createRouter } = require('./api');
const Wechat = require("../interface/wechat");

const WEGE_BASE_API_URL = `http://127.0.0.1:2531/v2/api`;
const WEGE_FILE_API_URL = `http://127.0.0.1:2532/download`;

const static = path.join(process.cwd(), 'static');
const imgStatic = path.join(static, 'img');
const fileStatic = path.join(static, 'file');
const uploadStatic = path.join(static, 'uploads');

fs.mkdirSync(static, { recursive: true });
fs.mkdirSync(imgStatic, { recursive: true });
fs.mkdirSync(fileStatic, { recursive: true });
fs.mkdirSync(uploadStatic, { recursive: true });

const bot = new GeweBot({
  debug: false, // 是否开启调试模式 默认false
  base_api: WEGE_BASE_API_URL, // Gewechat启动后的基础api地址base_api 默认为 `http://本机ip:2531/v2/api`
  file_api: WEGE_FILE_API_URL, // Gewechat启动后的文件api地址base_api 默认为 `http://本机ip:2532/download`,
  port: 3333, // 本地服务端口 默认3333,
  static: './static', // 静态资源目录 默认为当前目录下的static文件夹
});

// 监听消息事件
const onMessage = async (msg) => {
  let from = await msg.from();
  from = await Wechat.contactToJson(from);
  let src;
  const sourceId = msg.toId == msg.wxid ? msg.fromId : msg.toId;
  const isRoom = sourceId.endsWith('@chatroom');
    let room;
  if (isRoom) {
    const chatroom = bot.db.findOneByChatroomId(sourceId);
    if (chatroom) room = new bot.Room(chatroom);
    else room = await msg.room();
    src = Wechat.roomToJson(room);
  } else {
    const contact = await bot.Contact.find({ id: sourceId });
    if (contact) src = await Wechat.contactToJson(contact);
    else src = sourceId == msg.toId ? Wechat.contactToJson(await msg.to()) : from;
  }
  // 处理消息...
  const base = {
    id: msg._newMsgId,
    from,
    in: src,
    isRoom,
    self: await msg.self(),
    mentionSelf: await msg.mentionSelf(),
    date: msg.date(),
    age: msg.age(),
    source: msg.getXmlToJson?.(),
  }
  // 回复文本消息
  if (msg.type() === bot.Message.Type.Text) { //类型详见 MessageType 表
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
    } catch (e) {
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
    const data = bot.Message.getXmlToJson(msg.text());
    wss.send({
      type: bot.Message.Type.Emoji, data: {
        md5: data.msg.emoji.md5,
        size: data.msg.emoji.len,
        url: data.msg.emoji.cdnurl
      }, ...base
    });
  }
  else if (msg.type() === bot.Message.Type.Quote) {
    const data = bot.Message.getXmlToJson(msg.text());
    wss.send({
      type: bot.Message.Type.Quote, data: {
        content: data.msg.appmsg?.title,
        refermsg: data.msg.appmsg?.refermsg
      }, ...base
    });
  }
  else if(msg.type() === bot.Message.Type.Pat) {
    const data = bot.Message.getXmlToJson(msg.text());
    const pat = data.sysmsg.pat;
    if (isRoom) {
      pat.template = pat.template.replace(/\${(.*?)}/g, (match, key, ...params) => {
        const contact = room.memberList.find(m => m.wxid === key);
        if (!contact) return match;
        return contact.displayName || contact.nickName;
      })
    } else {
      pat.template = pat.template.replace(/\${(.*?)}/g, (match) => {
        return src.alias || src.name;
      })
    }
    wss.send({
      type: bot.Message.Type.Pat, data: pat.template, ...base
    });
  }
  else if ((msg._type === 10002) || msg.type() === bot.Message.Type.Revoke) {
    const data = bot.Message.getXmlToJson(msg.text());
    if (!data.sysmsg.revoke_climsgid) return;
    const msgId = data.sysmsg.revoke_climsgid.split('_')[0];
    await Wechat.revokeMsg(msgId);
    wss.send({
      type: bot.Message.Type.Revoke, data: {
        content: data.sysmsg.replacemsg,
        id: msgId
      },
    });
  }
  else if (msg.type() && isNaN(msg.type())) {
    const data = bot.Message.getXmlToJson(msg.text());
    wss.send({ type: msg.type(), data, ...base });
  } else {
    console.log(msg);
  }
};

bot.on("message", (msg) => {
  // 此处放回的msg为Message类型 可以使用Message类的方法
  onMessage(msg);
});


bot.on('all', msg => { // 如需额外的处理逻辑可以监听 all 事件 该事件将返回回调地址接收到的所有原始数据
  //console.log('received all event.', msg)
})

bot
  .start()
  .then(async ({ app, router }) => {
    createRouter(bot, router, wss) // 创建路由
    app.use(router.routes()).use(router.allowedMethods());
  })
  .catch((e) => {
    console.error(e);
  });