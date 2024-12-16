const WebSocket = require('ws');
const querystring = require('querystring');
const config = require('../config');
const wss = new WebSocket.Server({ port: 3334, verifyClient: function (info, cb) {
  const token = querystring.parse(info.req.url.replace(/^.*\?/, '')).token
    if (config.token.includes(token)) {
      info.req.userId = token
      cb(true)
    } else {
      cb(false, 401)
    }
  }
});
wss.on('connection', function connection(ws, req) {
  ws.on('message', function incoming(message) {
    console.log('received: %s', message);
  });
  ws.send('something');
});

module.exports = {
  send(data) {
    wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }
};