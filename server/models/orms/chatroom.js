const db = require('../db');
const prefix = require('../config').prefix;
let orm = {
    wxid: {
        type: db.STRING(128),
        comment: 'chatroom id',
        defaultValue: '',
    },
    nickname: {
        type: db.STRING(256),
        comment: '昵称'
    },
    avatar: {
        type: db.STRING(1024),
        comment: '头像',
        defaultValue: '',
    },
    remark: {
        type: db.STRING(128),
        comment: '备注',
        defaultValue: '',
    },
    last_chat_time: {
        type: db.INTEGER,
        comment: '最后聊天时间',
        defaultValue: 0,
    },
};
let table_name = prefix + 'chatroom';
module.exports = db.defineModel(table_name, orm, {
    comment: '群聊表',
});
module.exports.db = db;
module.exports.tb = table_name;
module.exports.keys = function () {
    return Object.keys(orm);
};