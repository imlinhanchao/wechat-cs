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

  router.post('/verify', async (ctx) => {
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

  router.post('/send', async (ctx) => {
    const body = ctx.request.body;
    const token = ctx.request.header.authorization;
    if (!verifyToken(ctx)) return;
    const { text, ...params } = body;
    const contact = await bot.Contact.find(params);
    msgList.push(await contact.say(text));
    ctx.body = {
      code: 200,
      message: '发送成功'
    }
  })
  router.get('/contacts', async (ctx) => {
    if (!verifyToken(ctx)) return;
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
  router.get('/contact', async (ctx) => {
    if (!verifyToken(ctx)) return;
    const query = ctx.request.query;
    const contact = await bot.Contact.find(query);
    ctx.body = {
      code: 200,
      data: contact
    }
  })
}

module.exports = {
  createRouter,
  msgList
}