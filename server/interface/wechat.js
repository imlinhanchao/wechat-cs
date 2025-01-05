const ChatRoomModel = require('../models').chatroom;
const ContactModel = require('../models').contact;
const MsgModel = require('../models').msg;

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


class Wechat 
{
  static msgList = [];

  constructor(bot, wss) {
    this.bot = bot;
    this.wss = wss;
  }

  async send({ text, ...params}) {
    const contact = await queryTarget(params);
    const msg = await contact.say(text);
    const info = await bot.info();
    Wechat.msgList.push(msg);
    let room = false;
    if (contact.chatroomId) {
      room = await roomToJson(contact)
    }
    this.wss.send({
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
      Wechat.msgList.splice(Wechat.msgList.indexOf(msg), 1);
    }, 1000 * 60 * 5);

    return {
      code: 200,
      message: '发送成功',
      data: msg,
    }
  }

  rooms() {
    const rooms = bot.db.findAllRooms();
    return {
      code: 200,
      data: rooms
    }
  }

  async contacts() {
    const contacts = await bot.Contact.findAll();
    return {
      code: 200,
      data: (await Promise.all(contacts.map(contactToJson))).concat(bot.db.findAllRooms().map(roomToJson))
    }
  }

  async contact(query) {
    const contact = await bot.Contact.find(query);
    return {
      code: 200,
      data: await contactToJson(contact)
    }
  }

  async revoke(body) {
    const msg = Wechat.msgList.find(m => m.newMsgId === body.id);
    if (!msg) {
      return {
        code: 400,
        message: '消息不存在',
      }
    }
    await msg.revoke();
    return {
      code: 200,
      message: '撤回成功',
    }
  }

  async info() {
    return {
      code: 200,
      data: await bot.info()
    }
  }

  async qrcode() {
    return {
      code: 200,
      data: await bot.qrcode()
    }
  }

  async getMessage({ id, count = 20, index = 0, chat_time = 0 }) {
    const messages = await MsgModel.findAll({
      where: {
        from: id,
        chat_time: {
          [Op.lt]: chat_time || Date.now(),
        }
      },
      raw: true,
      order: [['chat_time', 'DESC']],
      limit: count,
      offset: index,
    });
    return {
      code: 200,
      data: messages,
    }
  }

  static async saveContacts(contacts) {
    const saved = await ContactModel.findAll({
      where: {
        wxid: {
          [Op.in]: contacts.map(c => c.UserName),
        }
      }
    });
    contacts = contacts.filter(c => !saved.some(s => s.wxid === c.UserName));
    return await ContactModel.bulkCreate(contacts.map(c => ({
      wxid: c.UserName,
      nickname: c.NickName,
      avatar: c.bigHeadImgUrl,
      remark: c.Remark,
      last_chat_time: 0,
    })), { returning: true });
  }

  static async saveChatrooms(chatrooms) {
    const saved = await ChatRoomModel.findAll({
      where: {
        wxid: {
          [Op.in]: chatrooms.map(c => c.UserName),
        }
      }
    });
    chatrooms = chatrooms.filter(c => !saved.some(s => s.wxid === c.UserName));
    return await ChatRoomModel.bulkCreate(chatrooms.map(c => ({
      wxid: c.UserName,
      nickname: c.NickName,
      avatar: c.bigHeadImgUrl,
      remark: c.Remark,
      last_chat_time: 0,
    }), { returning: true }));
  }

  static saveMessage(msg) {
    return MsgModel.create({
      msgId: msg.id,
      from: msg.in.id,
      from: msg.in.name,
      talkerId: msg.from.id,
      talkerName: msg.from.name,
      content: msg.data,
      type: msg.type,
      chat_time: msg.date,
      source: JSON.stringify(msg.source || {}),
    });
  }
  
  _queryTarget({ id, isRoom }) {
    if (!isRoom && !id.endsWith('@chatroom')) {
      return bot.Contact({ id });
    } else {
      return new bot.Room(bot.db.findOneByChatroomId(id));
    }
  }

}

module.exports = Wechat;