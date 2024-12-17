const SQLite = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { authenticator }  = require('otplib');
class User {
  constructor() {
    this.config = null;
    this.tmpConfig = null;
    this.db = new SQLite('user.db');
    this.initTable();
    const configPath = path.join(__dirname, '..', 'config.json');
    if (fs.existsSync(configPath)) {
      this.config = JSON.parse(fs.readFileSync(configPath).toString());
    }
  }

  get isInit() {
    return !!this.config;
  }

  init(code = '') {
    if (!code) {
      const secret = authenticator.generateSecret();
      const qrurl = authenticator.keyuri(Date.now().toString(), 'WechatCode', secret);
      this.tmpConfig = { secret, qrurl };
      return qrurl;
    }
    if (this.verify(code)) {
      this.config = this.tmpConfig;
      fs.writeFileSync(path.join(__dirname, '..', 'config.json'), JSON.stringify(this.config));
    } else {
      return '';
    }
    return this.config.qrurl;
  }

  verify (mfaCode) {
    const secret = this.config?.secret || this.tmpConfig?.secret || '';
    if (!secret) return false;
    return authenticator.check(mfaCode, secret);
  }

  exist(name) {
    return fs.existsSync(name);
  }

  initTable() {
    const tableExists = this.db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='user'`).get();
    if (tableExists) {
      this.db.prepare(`Delete FROM user WHERE create_time < datetime('now', '-7 day')`).run();
      return;
    }
    this.db.prepare('CREATE TABLE user (token TEXT PRIMARY KEY, create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP)').run();
  }

  insert(token) {
    this.db.prepare('INSERT INTO user (token) VALUES (?)').run(token);
  }

  find(token) {
    return this.db.prepare('SELECT * FROM user WHERE token = ?').get(token);
  }

  remove(token) {
    this.db.prepare('DELETE FROM user WHERE token = ?').run(token);
  }
}

module.exports = { 
  User
}