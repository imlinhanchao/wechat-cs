const {
  Filebox
} = require("gewechaty");
const jsdom = require("jsdom");
const { Op } = require('sequelize');
const { sequelize } = require('../models/db');
const ChatRoomModel = require('../models').chatroom;
const ContactModel = require('../models').contact;
const MsgModel = require('../models').msg;
const EmojiModel = require('../models').emoji;
const path = require('path');
const { isReadable } = require("stream");

const parseXml = (xmlString) => {
  return new jsdom.JSDOM(xmlString);
};

const getThumbFromStringContent = (content) => {
  try {
    let dom = parseXml(content).window.document;
    const emoji = dom.querySelector('emoji');
    if (emoji) {
      return JSON.stringify({
        url: emoji.getAttribute('cdnurl'),
        md5: emoji.getAttribute('md5'),
        size: emoji.getAttribute('len'),
      })
    }
    return '';
  } catch (e) {
    console.error(e)
  }
  return '';
}


class Wechat {
  static msgList = [];

  constructor(bot, wss) {
    this.bot = bot;
    this.wss = wss;
    this.info().then(info => {
      if (info.data) this.me = info.data
    });
  }

  async sendImg({ file, ...params }) {
    const contact = await this._queryTarget(params);
    const url = path.relative(path.join(process.cwd(), 'static'), file[0].path);
    const msg = await contact.say(Filebox.fromUrl(`${this.bot.proxy}/${url}`));

    return {
      code: 200,
      message: '发送成功',
      data: await this._afterSend(contact, msg, url, this.bot.Message.Type.Image),
    }
  }

  async sendEmoji ({ md5, size, url, ...params }) {
    const contact = await this._queryTarget(params);
    const emoji = new Emoji({
      emojiMd5: md5,
      emojiSize: size,
    });
    const msg = contact.say(emoji);

    return {
      code: 200,
      message: '发送成功',
      data: this._afterSend(contact, msg, {
        md5, size, url
      }, this.bot.Message.Type.Emoji),
    }
  }

  async send ({ text, ...params }) {
    const contact = await this._queryTarget(params);
    const msg = await contact.say(text);
    Wechat.msgList.push(msg);

    return {
      code: 200,
      message: '发送成功',
      data: this._afterSend(contact, msg, text, this.bot.Message.Type.Text),
    }
  }

  rooms () {
    const rooms = this.bot.db.findAllRooms();
    return {
      code: 200,
      data: rooms
    }
  }

  async contacts () {
    const contacts = await this.bot.Contact.findAll();
    return {
      code: 200,
      data: (await Promise.all(contacts.map(Wechat.contactToJson))).concat(bot.db.findAllRooms().map(Wechat.roomToJson))
    }
  }

  async contact (query) {
    const contact = await this.bot.Contact.find(query);
    return {
      code: 200,
      data: await Wechat.contactToJson(contact)
    }
  }

  async markRevoke(msgId) {
    await Wechat.revokeMsg(msgId);
    return {
      code: 200,
      data: true,
      message: '标记成功',
    }
  }

  static async revokeMsg(msgId) {
    await MsgModel.update({ isRevoke: true }, {
      where: {
        msgId,
      }
    });
    return {
      code: 200,
      data: true,
      message: '标记成功',
    }
  }

  async revoke (body) {
    const msg = Wechat.msgList.find(m => m.newMsgId.toString() === body.id);
    if (!msg) {
      return {
        code: 400,
        data: false,
        message: '消息已过期',
      }
    }
    await msg.revoke();
    await this.markRevoke(body.id);
    return {
      code: 200,
      data: true,
      message: '撤回成功',
    }
  }

  async info () {
    return {
      code: 200,
      data: await this.bot.info()
    }
  }

  async qrcode () {
    return {
      code: 200,
      data: await this.bot.qrcode()
    }
  }

  async near (query) {
    return {
      code: 200,
      data: await this.getNearContact(query)
    }
  }

  async readed(from) {
    const { data, message } = await MsgModel.update({ isReadable: true }, {
      where: {
        from: from.id,
        isReadable: false,
      }
    })
      .then(() => ({ data: true, message: '更新成功', }))
      .catch(e => ({ data: false, message: e.message, }));

    return {
      code: 200,
      data,
      message,
    }
  }

  async getNearContact ({ count = 20, index = 0 }) {
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

  async getMessage ({ id, count = 20, index = 0, chat_time = 0 }) {
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

  async getEmojis ({ count = 20, index = 0 }) {
    const emojis = await EmojiModel.findAll({
      raw: true,
      order: [['create_time', 'DESC']],
      limit: Number(count),
      offset: Number(index),
    });
    return {
      code: 200,
      data: emojis,
    }
  }

  static async saveContacts (contacts) {
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

  static async saveChatrooms (chatrooms) {
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

  static async saveMessage (msg) {
    try {
      const recvTypes = [
        'file', 'voice', 'emoji', 'image', 'text', 'video', 'quote', 'pat'
      ]
      if (!recvTypes.includes(msg.type?.toLowerCase()) || !msg.from.id) {
        return false;
      }
      if (msg.data?.refermsg?.msgsource) delete msg.data?.refermsg.msgsource
      if (await MsgModel.findOne({ where: { msgId: msg.id } })) {
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
        isReadable: false,
        isRevoke: false,
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

  static async saveMessagesFromBak (msgs, source, sourceName) {
    try {
      if (!msgs?.length) return true;
      const typeMap = { '1': 'text', '3': 'image', '34': 'voice', '43': 'video', '47': 'emoji', '106': 'quote', '55': 'file' };
      function quoteMsg ({ msg }) {
        if (msg.appmsg?.refermsg.msgsource) delete msg.appmsg?.refermsg.msgsource
        return msg && JSON.stringify({
          content: msg.appmsg?.title,
          refermsg: msg.appmsg?.refermsg
        })
      }
      function getContent (msg) {
        if (msg.Type == 47) {
          return getThumbFromStringContent(msg.StrContent);
        }
        if (msg.Type + msg.SubType == 106) {
          return quoteMsg(msg.compress_content);
        }
      }
      await MsgModel.bulkCreate(msgs.map(msg => ({
        msgId: msg.MsgSvrIDStr,
        from: source,
        fromName: sourceName,
        talkerId: msg.WxId || (msg.IsSender && !msg.StrTalker.endsWith('@chatroom') ? msg.StrTalker : ''),
        talkerName: msg.Remark || msg.NickName || '',
        content: getContent(msg) || msg.Image || msg.Thumb || msg.StrContent || '[未知消息]',
        type: msg.Type + msg.SubType,
        msg_type: typeMap[(msg.Type + msg.SubType).toString()] || 'text',
        chat_time: msg.CreateTime,
        source: msg.StrContent,
        isReadable: true,
        isRevoke: false,
      })));

      if (msgs.length === 0) return true;

      if (source.endsWith('@chatroom')) {
        ChatRoomModel.findOne({ where: { wxid: source } }).then(room => {
          room.update({ last_chat_time: msgs[0].CreateTime });
        });
      } else {
        ContactModel.findOne({ where: { wxid: source } }).then(contact => {
          contact.update({ last_chat_time: msgs[0].CreateTime });
        });
      }
      return true;
    } catch (error) {
      console.error('saveMessage: ', error.message, error.stack);
      return false;
    }
  }

  async _afterSend(contact, msg, data, type) {
    const info = this.me;
    let room = null;
    if (contact.chatroomId) {
      room = Wechat.roomToJson(contact)
    }
    this.wss.send({
      type: type,
      id: msg.newMsgId.toString(),
      data,
      from: {
        alias: info.nickName,
        avatarUrl: info.bigHeadImgUrl,
        name: info.nickName,
        gender: info.sex,
        province: info.province,
        city: info.city,
        self: true,
        id: info.wxid,
      },
      in: room || await Wechat.contactToJson(contact),
      isRoom: !!room,
      self: true,
      date: new Date(),
    });

    setTimeout(() => {
      Wechat.msgList.splice(Wechat.msgList.indexOf(msg), 1);
    }, 2 * 60000);

    return msg
  }

  _queryTarget ({ id, isRoom }) {
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