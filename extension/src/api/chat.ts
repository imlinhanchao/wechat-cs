import { defHttp } from "../lib/request";
import vscode from 'vscode';
import { ChatWs } from "./ws";
import { downloadFile, getConfig, getPasteImage, getTmpFolder, isDevMode, openFile } from "../lib/utils";
import FormData from "form-data";
import * as fs from 'fs';
import * as path from 'path';
import { count } from "console";

export class Chat {
  token: string = '';
  context: vscode.ExtensionContext
  chatws?: ChatWs;
  infoPromise?: Promise<any>;
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.token = context.globalState.get('token') || '';
    defHttp.token = this.token;
    if (this.isLogin) {
      this.infoPromise = this.info();
      this.getEmojis({ count: 0 });
    }
  }

  get isLogin() {
    return !!this.token;
  }

  async login(code: string) {
    return defHttp.post<string>('/login', { code })
      .then((data: string) => {
        this.context.globalState.update('token', data);
        defHttp.token = this.token = data;
        return true
      })
      .catch(err => {
        vscode.window.showInformationMessage(err.message)
        return false
      });
  }

  async qrCode() {
    return defHttp.get<string>('/qrcode')
      .catch(err => {
        vscode.window.showInformationMessage(err.message)
        return false
      });
  }

  async info() {
    return defHttp.get<any>('/wechat/info')
      .catch(err => {
        if (err.message == '未授权') {
          this.context.globalState.update('token', '');
          defHttp.token = this.token = '';
        } else vscode.window.showInformationMessage(err.message)
        return false
      });
  }

  async rooms() {
    return defHttp.get<any>('/wechat/rooms')
      .catch(err => {
        vscode.window.showInformationMessage(err.message)
        return false
      });
  }
  
  async contacts() {
    return defHttp.get<any>('/wechat/near')
      .catch(err => {
        vscode.window.showInformationMessage(err.message)
        return false
      });
  }

  async contact(params: any) {
    return defHttp.get<any>('/wechat/contact', params)
      .catch(err => {
        vscode.window.showInformationMessage(err.message)
        return false
      });
  }

  async emojiCache(emojis: any[]) {
    const { server } = getConfig();
    for (let emoji of emojis) {
      const savePath = isDevMode ? 
        path.resolve(__dirname, '..', '..', 'webview', 'public', 'emoji', `face_${emoji.md5}`) : 
        path.resolve(__dirname, '..', 'webview', 'emoji', `face_${emoji.md5}`);
      if (!fs.existsSync(savePath)) {
        await downloadFile(`${server}/media?url=${encodeURIComponent(emoji.url)}`, savePath);
      }
    }
    return ;
  }

  async getEmojis(params: any) {
    return defHttp.get<any>('/wechat/getEmojis', params)
      .then((res) => {
        this.emojiCache(res);
        return res;
      })
      .catch(err => {
        vscode.window.showInformationMessage(err.message)
        return false
      });
  }
  
  async history(params: any) {
    return defHttp.get<any>('/wechat/getMessage', params)
      .then((res) => {
        return res.map((item: any) => {
          return {
            id: item.msgId,
            type: item.msg_type,
            data: item.content,
            from: { name: item.talkerName, id: item.talkerId },
            in: { name: item.fromName, id: item.from },
            isRoom: item.from.endsWith('@chatroom'),
            self: !item.talkerId,
            date: item.chat_time,
            age: 0,
            isReaded: item.isReadable,
            isRevoked: item.isRevoked,
          }
        });
      })
      .catch(err => {
        vscode.window.showInformationMessage(err.message)
        return false
      });
  }

  async quote(params: any) {
    return defHttp.post<any>('/wechat/quote', params)
      .catch(err => {
        vscode.window.showInformationMessage(err.message)
        return false
      });
  }

  async send(params: any) {
    return defHttp.post<any>('/wechat/send', params)
      .catch(err => {
        vscode.window.showInformationMessage(err.message)
        return false
      });
  }

  async sendEmoji(params: any) {
    return defHttp.post<any>('/wechat/sendEmoji', params)
      .catch(err => {
        vscode.window.showInformationMessage(err.message)
        return false
      });
  }

  async sendImg(params: any) {
    const file = params.file || await openFile({
      filters: {
        Image: ['jpg', 'jpeg', 'bmp', 'gif', 'png']
      }
    });
    if (!file) return;
    const form = new FormData();
    form.append('file', fs.readFileSync(file), path.basename(file));
    const { file: _, ...data } = params
    Object.keys(data).forEach(key => {
      form.append(key, data[key]);
    });
    return defHttp.post<any>('/wechat/sendImg', form)
      .catch(err => {
        vscode.window.showInformationMessage(err.message)
        return false
      });
  }

  async pasteAndSend(params: any) {
    let savePath = getTmpFolder();
    savePath = path.resolve(savePath, `pic_${new Date().getTime()}.png`);
    let [file] = await getPasteImage(savePath);
    if (!file) return;
    return this.sendImg({ ...params, file });
  }

  async readed(params: any) {
    return defHttp.post<any>('/wechat/readed', params)
      .catch(err => {
        vscode.window.showInformationMessage(err.message)
        return false
      });
  }

  async revoke(params: any) {
    return defHttp.post<any>('/wechat/revoke', params)
      .catch(err => {
        vscode.window.showInformationMessage(err.message)
        return false
      });
  }

  async connect(response?: (data: any) => void) {
    if (this.chatws || !this.isLogin) {
      return;
    }
    this.chatws = new ChatWs(this.token);
    this.chatws.addListener((msg: any) => {
      response?.(msg);
    });
  }

  get isConnect() {
    return !!this.chatws;
  }

  async config() {
    return getConfig();
  }
}