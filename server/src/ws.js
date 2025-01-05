const WebSocket = require('ws');
const querystring = require('querystring');
const { User } = require('./db');
const Wechat = require('../interface/wechat');

const wss = new WebSocket.Server({ port: 3334, verifyClient: function (info, cb) {
    const user = new User();
    const { token, group } = querystring.parse(info.req.url.replace(/^.*\?/, '')).token
    if (!user.find(token)) {
      cb(true)
    } else {
      cb(false, 401)
    }
  }
});
wss.on('connection', (ws, req) => {
  const query = querystring.parse(req.url.replace(/^.*\?/, ''));
  ws.query = query;
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    console.log(data)
  });
});

module.exports = {
  send(data) {
    Wechat.saveMessage(data);
    wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN && !client.query.group) {
        client.send(JSON.stringify(data));
      }
    });
  },
  sendGroup(data, group) {
    wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN && client.query.group == group) {
        client.send(JSON.stringify(data));
      }
    });
  }
};