import vscode from 'vscode';
import { IMessage, WebView } from "../lib/webview";

export class PreviewWebview extends WebView{
  panel?: vscode.WebviewPanel;

  constructor(context: vscode.ExtensionContext, images: string[]) {
    super(context);
    this.panel = vscode.window.createWebviewPanel(
      'image-preview',
      'Image Preview',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );
    this.setWebview(this.panel.webview, {
      name: 'image-preview',
      path: '/preview?images=' + encodeURIComponent(images.join(',')),
      onMessage: (message) => this.onMessage(message),
    });
    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });
  }

  addImage (images: string[]) {
    this.response('image', images);
    this.panel?.reveal(vscode.ViewColumn.One)
  }

  onMessage (message: IMessage) {
    switch(message.command) {
      case 'close':
        this.panel?.dispose();
        break;
    }
  }
}