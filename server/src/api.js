
const msgList = []
function createRouter(bot, router) {
  router.post('/send', async (ctx) => {
    const body = ctx.request.body;
    const { text, ...params } = body;
    const contact = await bot.Contact.find(params);
    msgList.push(await contact.say(text));
    ctx.body = {
      code: 200,
      message: '发送成功'
    }
  })
  router.get('/contacts', async (ctx) => {
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