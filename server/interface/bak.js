const fetch = require('node-fetch');
const querystring = require('querystring');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const schedule = require('node-schedule');

class Bak {
  constructor() {
    this.config = null;
    const configPath = path.join(__dirname, '..', 'config.json');
    if (fs.existsSync(configPath)) {
      this.config = JSON.parse(fs.readFileSync(configPath).toString());
      if (!this.config.token) this.loginWait = this.login();
    } else {
      this.loginWait = Promise.resolve(true);
    }
  }

  createTask() {
    // POST /api/task/single-decrypt/1
    return this.request('/api/task/single-decrypt/1', {
      method: 'POST',
      data: {}
    })
  }

  nearContact({page = 1, size = 20}) {
    // /api/msg/sessions?page=1&size=20
    return this.request('/api/msg/sessions', {
      params: {
        page,
        size
      }
    })
  }

  searchContact({search = '', page = 1, size = 20, ChatRoomType = 0}) {
    // /api/msg/contact-split?page=1&size=1000&ChatRoomType=2&search=
    return this.request('/api/msg/contact-split', {
      params: {
        page,
        size,
        ChatRoomType,
        search
      }
    })
  }

  // /api/msg/msgs?strUsrName=3746675024@chatroom&page=1&size=30&start=0&dbNo=-1&filterType=undefined&filterText=undefined&filterDay=undefined&filterUser=undefined
  getMessage({strUsrName, page = 1, size = 30, start = 0, dbNo = -1, filterType = 'undefined', filterText = 'undefined', filterDay = 'undefined', filterUser = 'undefined'}) {
    return this.request('/api/msg/msgs', {
      params: {
        strUsrName,
        page,
        size,
        start,
        dbNo,
        filterType,
        filterText,
        filterDay,
        filterUser
      }
    })
  }

  login() {
    // POST /api/auth/token
    const data = new FormData();
    data.append('username', this.config.user);
    data.append('password', this.config.passwd);
    return this.request('/api/auth/token', {
      method: 'POST',
      data
    }).then(rsp => {
      if (!rsp.access_token) return false;
      this.config.token = rsp.access_token;
      fs.writeFileSync(path.join(__dirname, '..', 'config.json'), JSON.stringify(this.config, null, 2));
      return true;
    })
  }

  request(url, options) {
    url = `${this.config.url}${url}?${querystring.stringify(options.params || {})}`;
    const body = options.data instanceof FormData ? options.data : JSON.stringify(options.data);
    return fetch(url, {
      method: options.method || (options.data ? 'POST' : 'GET'),
      headers: {
        'Authorization': this.config.token ? `Bearer ${this.config.token}` : undefined
      },
      body: options.method != 'GET' ? body : undefined,
    }).then(rsp => rsp.json())
  }

  static SyncSchedule() {
    if (Bak.syncJob) return;
    const bak = new Bak();
    console.log('已创建云朵备份同步任务排程');
    Bak.syncJob = schedule.scheduleJob('0 0 8 * * *', async () => {
      await bak.loginWait;
      await bak.createTask();
      console.log('已触发云朵备份同步任务');
    });
  }
}

module.exports = Bak;