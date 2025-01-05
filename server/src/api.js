const { User } = require('./db');
const Wechat = require('../interface/wechat');
const Bak = require('../interface/bak');
const crypto = require('crypto');

function createRouter (bot, router, wss) {
  const user = new User();
  const wechat = new Wechat(bot, wss);
  const bak = new Bak();

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

  function initCheck(ctx) {
    if (!user.isInit) {
      ctx.body = {
        code: 401,
        message: '未初始化'
      }
      return false;
    }
    if (!verifyToken(ctx)) return false;
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
        message: '初始化成功'
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

  function loadRouter(instance, path) {
    router.all(`/${path}/:call`, async (ctx, next) => {
      if (!initCheck(ctx)) return;
      if (instance[ctx.params.call]) {
        try {
          ctx.body = await instance[ctx.params.call]({ ...ctx.request.body, ...ctx.request.query });
        } catch (error) {
          ctx.body = {
            code: 500,
            message: error.message
          }
        }
      } else {
        await next();
      }
    });
  }

  loadRouter(wechat, 'wechat');
  loadRouter(bak, 'bak');
}

module.exports = {
  createRouter,
  msgList,
  contactToJson,
  roomToJson,
}