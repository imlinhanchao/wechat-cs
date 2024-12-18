import { defHttp } from "../lib/request";
import vscode from 'vscode';

export class Chat {
  token: string = '';
  context: vscode.ExtensionContext
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
    return defHttp.get<any>('/info')
      .catch(err => {
        vscode.window.showInformationMessage(err.message)
        return false
      });
  }
  
  async contacts() {
    return defHttp.get<any>('/contacts')
      .catch(err => {
        vscode.window.showInformationMessage(err.message)
        return false
      });
  }

  async contact(params: any) {
    return defHttp.get<any>('/contact', params)
      .catch(err => {
        vscode.window.showInformationMessage(err.message)
        return false
      });
  }

  async send(params: any) {
    return defHttp.post<any>('/send', params)
      .catch(err => {
        vscode.window.showInformationMessage(err.message)
        return false
      });
  }

  async revoke(params: any) {
    return defHttp.post<any>('/revoke', params)
      .catch(err => {
        vscode.window.showInformationMessage(err.message)
        return false
      });
  }
}