import vscode from 'vscode';
import { IMessage, WebView } from "../lib/webview";
import { getConfig, prompt, setConfig } from '../lib/utils';
import { Chat } from '../api/chat';
import { PreviewWebview } from './preview';

export class PanelProvider extends WebView implements vscode.WebviewViewProvider {
	public static readonly viewType = 'wechaty.panel';
	private _view?: vscode.WebviewView;
  private chat: any;
  private _extensionPath: string;
  private _preview?: PreviewWebview;

  constructor(context: vscode.ExtensionContext) {
    super(context);
    this.chat = new Chat(context);
    this._extensionPath = context.extensionPath
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    this.setWebview(webviewView.webview, {
      name: 'wechaty-panel',
      path: this.chat.isLogin ? '/' : '/login',
      onMessage: (message) => this.onMessage(message),
    });
    vscode.workspace.onDidChangeConfiguration((event) => {
      if(event.affectsConfiguration('wechaty.blocks')) {
        this.response('blocks', getConfig().blocks );
      }
    });
    vscode.workspace.onDidChangeConfiguration((event) => {
      if(event.affectsConfiguration('wechaty.websocket')) {
        if (this.chat.isConnect) {
          this.chat.chatws.rws.close();
          this.chat.chatws = undefined;
          this.chat.connect((data: any) => this.response('connect', data));
        }
      }
    });
  }

  async onMessage (message: IMessage) {
    if (message.command === 'block') {
      const blocks = getConfig().blocks;
      const block = blocks.findIndex((b: any) => b === message.data);
      if (block > -1) {
        blocks.splice(block, 1);
      } else {
        blocks.push(message.data);
      }
      setConfig('blocks', blocks);
      return;
    }
    if (message.command === 'blocks') {
      this.response('blocks', getConfig().blocks);
      return;
    }
    if (message.command === 'connect') {
      this.chat.connect((data: any) => this.response('connect', data));
      return;
    }
    if (message.command === 'preview') {
      if (this._preview && this._preview.panel) {
        this._preview.addImage(message.data.images[0]);
      } else {
        this._preview = new PreviewWebview(this.context, message.data.images);
      }
      return;
    }
    const keys = Object.keys(this.chat);
    const call = this.chat[message.command];
    if (call instanceof Function) {
      const rsp = await this.chat[message.command](message.data);
      message.response?.(rsp);
    } else if (call !== undefined) {
      message.response?.(call);
    }
  }
}