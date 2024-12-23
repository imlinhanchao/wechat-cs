const { User } = require('./db');
const crypto = require('crypto');

async function contactToJson (contact) {
  return {
    alias: await contact.alias(),
    avatarUrl: await contact.avatar(),
    name: contact.name(),
    type: contact.type(),
    gender: contact.gender(),
    province: contact.province(),
    city: contact.city(),
    self: contact.self(),
    id: contact._wxid
  }
}

function roomToJson (room) {
  return {
    alias: room.name || room.remark || room.nickName,
    avatarUrl: room.avatarImg || room.smallHeadImgUrl,
    name: room.name || room.nickName,
    type: 2,
    id: room.chatroomId,
    room: { ...room },
  }
}



const msgList = []
function createRouter (bot, router, wss) {
  const user = new User();

  function queryTarget({ id, isRoom }) {
    if (!isRoom && !id.endsWith('@chatroom')) {
      return bot.Contact({ id });
    } else {
      return new bot.Room(bot.db.findOneByChatroomId(id));
    }
  }

  function verifyToken (ctx) {
    const token = ctx.request.header.authorization;
    if (!token || !user.find(token)) {
      ctx.body = {
        code: 401,
        message: '未授权'
      }
      return false;
    }
    return true;
  }

  if (!user.isInit) {
    router.get('/init', async (ctx) => {
      ctx.body = {
        code: 200,
        data: user.init()
      }
    });
    router.post('/init', async (ctx) => {
      const body = ctx.request.body;
      if (!body.code || !user.init(body.code)) {
        return ctx.body = {
          code: 400,
          message: '验证失败'
        }
      }
      ctx.body = {
        code: 200,
        data: '初始化成功'
      }
    });
  }

  router.get('/emoji', async (ctx) => {
    const url = ctx.query.url;
    await fetch(url).then(res => res.blob()).then(blob => blob.arrayBuffer()).then(buffer => {
      ctx.body = Buffer.from(buffer)
    })
  })

  router.get('/inited', async (ctx) => {
    ctx.body = {
      code: 200,
      data: user.isInit
    }
  });

  router.all('/chat/:call', async (ctx, next) => {
    if (!user.isInit) {
      return ctx.body = {
        code: 401,
        message: '未初始化'
      }
    }
    if (!verifyToken(ctx)) return;
    await next();
  });

  router.post('/login', async (ctx) => {
    const body = ctx.request.body;
    if (!body.code || !user.verify(body.code)) {
      return ctx.body = {
        code: 400,
        message: '验证失败'
      }
    }
    const token = crypto.randomBytes(16).toString('hex');
    user.insert(token);
    ctx.body = {
      code: 200,
      data: token
    };
  });

  router.post('/chat/send', async (ctx) => {
    const body = ctx.request.body;
    const { text, ...params } = body;
    const contact = await queryTarget(params);
    const msg = await contact.say(text);
    const info = await bot.info();
    msgList.push(msg);
    let room = false;
    if (contact.chatroomId) {
      room = await roomToJson(contact)
    }
    wss.send({
      type: bot.Message.Type.Text,
      id: msg.newMsgId.toString(),
      data: text,
      from: {
        alias: info.nickName,
        avatarUrl: info.bigHeadImgUrl,
        name: info.nickName,
        type: 1,
        gender: info.sex,
        province: info.province,
        city: info.city,
        self: true,
        id: info.wxid
      },
      in: room || await contactToJson(contact),
      isRoom: !!room,
      self: true,
    });
    setTimeout(() => {
      msgList.splice(msgList.indexOf(msg), 1);
    }, 1000 * 60 * 5);
    ctx.body = {
      code: 200,
      message: '发送成功',
      data: msg,
    }
  })
  router.get('/chat/rooms', async (ctx) => {
    const rooms = bot.db.findAllRooms();
    ctx.body = {
      code: 200,
      data: rooms
    }
  })
  router.get('/chat/contacts', async (ctx) => {
    const contacts = await bot.Contact.findAll();
    ctx.body = {
      code: 200,
      data: (await Promise.all(contacts.map(contactToJson))).concat(bot.db.findAllRooms().map(roomToJson))
    }
  })
  router.get('/chat/contact', async (ctx) => {
    const query = ctx.request.query;
    const contact = await bot.Contact.find(query);
    ctx.body = {
      code: 200,
      data: await contactToJson(contact)
    }
  })
  router.post('/chat/revoke', async (ctx) => {
    const body = ctx.request.body;
    const msg = msgList.find(m => m.newMsgId === body.id);
    if (!msg) {
      return ctx.body = {
        code: 404,
        message: '消息不存在'
      }
    }
    await msg.revoke();
    ctx.body = {
      code: 200,
      message: '撤回成功'
    }
  })
  router.get('/chat/info', async (ctx) => {
    ctx.body = {
      code: 200,
      data: await bot.info()
    }
  })
  router.get('/chat/qrcode', async (ctx) => {
    ctx.body = {
      code: 200,
      data: await bot.qrcode()
    }
  })
}

module.exports = {
  createRouter,
  msgList,
  contactToJson,
  roomToJson,
}