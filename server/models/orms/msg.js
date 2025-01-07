const db = require('../db');
const prefix = require('../config').prefix;
let orm = {
    msgId: {
        type: db.STRING(128),
        comment: '消息Id',
        defaultValue: '',
    },
    from: {
        type: db.STRING(256),
        comment: '消息来源'
    },
    fromName: {
        type: db.STRING(256),
        comment: '消息来源名称'
    },
    talkerId: {
        type: db.STRING(128),
        comment: '发送者Id',
        defaultValue: '',
    },
    talkerName: {
        type: db.STRING(128),
        comment: '发送者昵称',
        defaultValue: '',
    },
    content: {
        type: db.STRING(8192),
        comment: '消息内容',
        defaultValue: '',
    },
    type: {
        type: db.INTEGER,
        comment: '消息类型',
        defaultValue: 0,
    },
    chat_time: {
        type: db.INTEGER,
        comment: '聊天时间',
        defaultValue: 0,
    },
    source: {
        type: db.TEXT,
        comment: '消息来源',
        defaultValue: '',
    },
    msg_type: {
        type: db.STRING(128),
        comment: '实时消息类型',
        defaultValue: '',
    }
};
let table_name = prefix + 'msg';
module.exports = db.defineModel(table_name, orm, {
    comment: '消息表',
});
module.exports.db = db;
module.exports.tb = table_name;
module.exports.keys = function () {
    return Object.keys(orm);
};