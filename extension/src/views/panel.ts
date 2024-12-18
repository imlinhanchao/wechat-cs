import vscode from 'vscode';
import { IMessage, WebView } from "../lib/webview";
import { getConfig, prompt } from '../lib/utils';
import { Chat } from '../api/chat';

export class PanelProvider extends WebView implements vscode.WebviewViewProvider {
	public static readonly viewType = 'wechaty.panel';
	private _view?: vscode.WebviewView;
  private chat: any;

  constructor(context: vscode.ExtensionContext) {
    super(context);
    this.chat = new Chat(context);
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    this.setWebview(webviewView.webview, {
      name: 'wechaty-panel',
      path: '/',
      onMessage: (message) => this.onMessage(message),
    });
  }

  async onMessage (message: IMessage) {
    if (this.chat[message.command]) {
      if (this.chat[message.command] instanceof Function) {
        const rsp = await this.chat[message.command](message.data);
        message.response?.(rsp);
      } else {
        message.response?.(this.chat[message.command]);
      }
      return;
    }
  }
}