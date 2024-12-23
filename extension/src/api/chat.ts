import { defHttp } from "../lib/request";
import vscode from 'vscode';
import { ChatWs } from "./ws";
import { getConfig } from "../lib/utils";

export class Chat {
  token: string = '';
  context: vscode.ExtensionContext
  chatws?: ChatWs;
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.token = context.globalState.get('token') || '';
    defHttp.token = this.token;
    if (this.isLogin) {
      this.info();
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
    return defHttp.get<any>('/chat/info')
      .catch(err => {
        vscode.window.showInformationMessage(err.message)
        return false
      });
  }

  async rooms() {
    return defHttp.get<any>('/chat/rooms')
      .catch(err => {
        vscode.window.showInformationMessage(err.message)
        return false
      });
  }
  
  async contacts() {
    return defHttp.get<any>('/chat/contacts')
      .catch(err => {
        vscode.window.showInformationMessage(err.message)
        return false
      });
  }

  async contact(params: any) {
    return defHttp.get<any>('/chat/contact', params)
      .catch(err => {
        vscode.window.showInformationMessage(err.message)
        return false
      });
  }

  async send(params: any) {
    return defHttp.post<any>('/chat/send', params)
      .catch(err => {
        vscode.window.showInformationMessage(err.message)
        return false
      });
  }

  async revoke(params: any) {
    return defHttp.post<any>('/chat/revoke', params)
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

  async config() {
    return getConfig();
  }
}