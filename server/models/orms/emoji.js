const db = require('../db');
const prefix = require('../config').prefix;
let orm = {
    md5: {
        type: db.STRING(128),
        comment: '表情包md5',
    },
    size: {
        type: db.INTEGER,
        comment: '表情包大小'
    },
    url: {
        type: db.STRING(1024),
        comment: '表情包地址',
    },
};
let table_name = prefix + 'emoji';
module.exports = db.defineModel(table_name, orm, {
    comment: '表情包表',
});
module.exports.db = db;
module.exports.tb = table_name;
module.exports.keys = function () {
    return Object.keys(orm);
};