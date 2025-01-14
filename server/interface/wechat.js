const jsdom = require("jsdom");
const { Op } = require('sequelize');
const { sequelize } = require('../models/db');
const ChatRoomModel = require('../models').chatroom;
const ContactModel = require('../models').contact;
const MsgModel = require('../models').msg;

const parseXml = (xmlString) => {
  return new jsdom.JSDOM(xmlString);
};

const getThumbFromStringContent = (content) => {
  try {
      let dom = parseXml(content).window.document;
      const emoji = dom.querySelector('emoji');
      if (emoji) {
          return emoji.getAttribute('cdnurl');
      }
      return '';
  } catch (e) {
      console.error(e)
  }
  return '';
}


class Wechat 
{
  static msgList = [];

  constructor(bot, wss) {
    this.bot = bot;
    this.wss = wss;
    this.info().then(info => {
      if (info.data) this.me = info.data
    });
  }

  async send({ text, ...params}) {
    const contact = await this._queryTarget(params);
    const msg = await contact.say(text);
    const info = await this.bot.info();
    Wechat.msgList.push(msg);
    let room = false;
    if (contact.chatroomId) {
      room = await Wechat.roomToJson(contact)
    }
    this.wss.send({
      type: this.bot.Message.Type.Text,
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
        id: this.me.wxid,
      },
      in: room || await Wechat.contactToJson(contact),
      isRoom: !!room,
      self: true,
      date: new Date(),
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
    const rooms = this.bot.db.findAllRooms();
    return {
      code: 200,
      data: rooms
    }
  }

  async contacts() {
    const contacts = await this.bot.Contact.findAll();
    return {
      code: 200,
      data: (await Promise.all(contacts.map(Wechat.contactToJson))).concat(bot.db.findAllRooms().map(Wechat.roomToJson))
    }
  }

  async contact(query) {
    const contact = await this.bot.Contact.find(query);
    return {
      code: 200,
      data: await Wechat.contactToJson(contact)
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
      data: await this.bot.info()
    }
  }

  async qrcode() {
    return {
      code: 200,
      data: await this.bot.qrcode()
    }
  }

  async near(query) {
    return {
      code: 200,
      data: await this.getNearContact(query)
    }
  }

  async getNearContact({ count = 20, index = 0 }) {
    const query = `
      SELECT id, wxid, nickname, avatar, remark, last_chat_time, create_time, update_time
      FROM wx.wx_contact
      UNION
      SELECT id, wxid, nickname, avatar, remark, last_chat_time, create_time, update_time
      FROM wx.wx_chatroom
      ORDER BY last_chat_time DESC
      LIMIT :limit OFFSET :offset
    `;

    const results = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT,
      replacements: {
        limit: count,
        offset: index,
      }
    });

    if (results.length == 0) {
      return await this.bot.Contact.findAll()
      .then(contacts => contacts.map((c) => {
        c = Wechat.contactToJson(c)
        return {
          id: c.id,
          wxid: c.id,
          avatar: c.avatarUrl,
          nickname: c.name,
          remark: c.alias,
        }
      }));
    }

    return results;
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
      limit: Number(count),
      offset: Number(index),
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

  static async saveMessage(msg) {
    try {
      const recvTypes = [
        'file', 'voice', 'emoji', 'image', 'text', 'video', 'quote', 
      ]
      if (!recvTypes.includes(msg.type?.toLowerCase()) || !msg.from.id) {
        return false;
      }
      await MsgModel.create({
        msgId: msg.id,
        from: msg.in.id,
        fromName: msg.in.name,
        talkerId: msg.from.id,
        talkerName: msg.from.name,
        content: typeof msg.data == 'string' ? msg.data : JSON.stringify(msg.data),
        msg_type: msg.type,
        type: 0,
        chat_time: msg.date.getTime() / 1000,
        source: JSON.stringify(msg.source || {}),
      });
  
      if (msg.isRoom) {
        ChatRoomModel.findOne({ where: { wxid: msg.in.id } }).then(room => {
          room?.update({ last_chat_time: msg.date.getTime() / 1000 });
        });
      } else {
        ContactModel.findOne({ where: { wxid: msg.in.id } }).then(contact => {
          contact?.update({ last_chat_time: msg.date.getTime() / 1000 });
        });
      }
      return true;
    } catch (error) {
      console.error('saveMessage: ', error.message, error.stack);
      return false;
    }
  }

  static async saveMessagesFromBak(msgs, source, sourceName) {
    try {
      if (!msgs?.length) return true;
      const typeMap = {'1': 'text', '3': 'image', '34': 'voice', '43': 'video', '47': 'emoji', '49': 'quote', '106': 'file'};
      await MsgModel.bulkCreate(msgs.map(msg => ({
        msgId: msg.MsgSvrIDStr,
        from: source,
        fromName: sourceName,
        talkerId: msg.WxId || (msg.IsSender && !msg.StrTalker.endsWith('@chatroom') ? msg.StrTalker : ''),
        talkerName: msg.Remark || msg.NickName || '',
        content: msg.Image || msg.Thumb || (msg.type == 47 || msg.StrContent.includes('<emoji') ? getThumbFromStringContent(msg.StrContent) : msg.StrContent) || '[未知消息]',
        type: msg.Type + msg.SubType,
        msg_type: typeMap[(msg.Type + msg.SubType).toString()] || 'text',
        chat_time: msg.CreateTime,
        source: msg.StrContent,
      })));

      if (msgs.length === 0) return true;
  
      if (source.endsWith('@chatroom')) {
        ChatRoomModel.findOne({ where: { wxid: source } }).then(room => {
          room.update({ last_chat_time: msgs[0].CreateTime });
        });
      } else {
        ContactModel.findOne({ where: { wxid: source } }).then(contact => {
          contact.update({ last_chat_time: msgs[0].CreateTime});
        });
      }
      return true;
    } catch (error) {
      console.error('saveMessage: ', error.message, error.stack);
      return false;
    }
  }
  
  _queryTarget({ id, isRoom }) {
    if (!isRoom && !id.endsWith('@chatroom')) {
      return this.bot.Contact.find({ id });
    } else {
      return new (this.bot.Room)(this.bot.db.findOneByChatroomId(id));
    }
  }

  static async contactToJson (contact) {
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
  
  static roomToJson (room) {
    return {
      alias: room.name || room.remark || room.nickName,
      avatarUrl: room.avatarImg || room.smallHeadImgUrl,
      name: room.name || room.nickName,
      type: 2,
      id: room.chatroomId,
      room: { ...room },
    }
  }
  
}

module.exports = Wechat;