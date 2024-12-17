const { User } = require('./db');
const crypto = require('crypto');

const msgList = []
function createRouter(bot, router) {
  const user = new User();

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

  function verifyToken(ctx) {
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

  router.post('/chat/send', async (ctx) => {
    const body = ctx.request.body;
    const { text, ...params } = body;
    const contact = await bot.Contact.find(params);
    const msg = await contact.say(text);
    msgList.push(msg);
    setTimeout(() => {
      msgList.splice(msgList.indexOf(msg), 1);
    }, 1000 * 60 * 5);
    ctx.body = {
      code: 200,
      message: '发送成功',
      data: msg,
    }
  })
  router.get('/chat/contacts', async (ctx) => {
    const contacts = await bot.Contact.findAll();
    ctx.body = {
      code: 200,
      data: await Promise.all(contacts.map(async c => ({
        alias: await c.alias(),
        avatarUrl: await c.avatar(),
        name: c.name(),
        type: c.type(),
        gender: c.gender(),
        province: c.province(),
        city: c.city(),
        self: c.self(),
        id: c._wxid 
      })))
    }
  })  
  router.get('/chat/contact', async (ctx) => {
    const query = ctx.request.query;
    const contact = await bot.Contact.find(query);
    ctx.body = {
      code: 200,
      data: contact
    }
  })
  router.post('/chat/revoke', async (ctx) => {
    const body = ctx.request.body;
    const msg = msgList.find(m => m.msgId === body.id);
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
  msgList
}