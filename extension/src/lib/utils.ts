import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// @ts-ignore
import * as pkg from '../../package.json';
import { spawn } from 'child_process';
import { tmpdir } from 'os';

const downloadFile = (async (url: string, path: string) => {
  const fetch = await import('node-fetch').then(r => r.default);
  const res = await fetch(url);
  const fileStream = fs.createWriteStream(path);
  await new Promise((resolve, reject) => {
      res.body?.pipe(fileStream);
      res.body?.on("error", reject);
      fileStream.on("finish", resolve);
    });
});

function showProgress (message: string) {
  let show = true;
  function stopProgress () {
    show = false;
  }

  vscode.window.withProgress({
    location: vscode.ProgressLocation.Window,
    title: message,
    cancellable: false
  }, (progress, token) => {
    return new Promise(resolve => {
      let timer = setInterval(() => {
        if (show) { return; }
        clearInterval(timer);
        resolve(show);
      }, 100);
    });
  });

  return stopProgress;
}

function editorEdit (selection: vscode.Selection | vscode.Position | undefined | null, text: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    vscode.window.activeTextEditor?.edit(editBuilder => {
      if (selection) {
        editBuilder.replace(selection, text);
      }
    }).then(resolve);
  });
}

function insertToEnd (text: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    let linenumber = vscode.window.activeTextEditor?.document.lineCount || 1;
    let pos = vscode.window.activeTextEditor?.document.lineAt(linenumber - 1).range.end || new vscode.Position(0, 0);
    vscode.window.activeTextEditor?.edit(editBuilder => {
      editBuilder.insert(pos, text);
    }).then(resolve);
  });
}

async function openFolder() {
  const uris = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false
  });

  if (uris && uris.length > 0) {
    return uris[0].fsPath;
  } else {
    return;
  }
}

async function openFile(options: any = {}) {
  const uris = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      ...options
  });

  if (uris && uris.length > 0) {
    return uris[0].fsPath;
  } else {
    return;
  }
}

function getSelections (): readonly vscode.Selection[] | null {
  let editor = vscode.window.activeTextEditor;
  if (!editor) {
    return null; // No open text editor
  }

  let selections = editor.selections;
  return selections;
}

function getSelectionByPosition (position: vscode.Position): vscode.Selection | null {
  let editor = vscode.window.activeTextEditor;
  if (!editor) {
    return null; // No open text editor
  }

  let selections = editor.selections;
  for (let i = 0; i < selections.length; i++) {
    let selection = selections[i];

    let line = { 
        begin: Math.min(selection.anchor.line, selection.active.line),
        end: Math.max(selection.anchor.line, selection.active.line)
    }, character = {
        begin: Math.min(selection.anchor.character, selection.active.character),
        end: Math.max(selection.anchor.character, selection.active.character)
    };

    if (line.begin > position.line || character.begin > position.character) {continue;}
    if (line.end < position.line || character.end < position.character) {continue;}
    return selection;
  }
  return null;
}

function highlightText(editor: vscode.TextEditor, range: vscode.Range | null, decoration?: vscode.TextEditorDecorationType) {
  if (decoration) {
    editor.setDecorations(decoration, []);
    return;
  }
  const decorationType = vscode.window.createTextEditorDecorationType({
    outline: '2px solid',
    borderRadius: '5px',
    outlineColor: new vscode.ThemeColor('button.background'),
  });
  editor.setDecorations(decorationType, [range!]);
  return decorationType;
}

function mkdirs (dirname: string) {
  if (fs.existsSync(dirname)) {
    return true;
  } else {
    if (mkdirs(path.dirname(dirname))) {
      fs.mkdirSync(dirname);
      return true;
    }
  }
}

function getEditorRoot (editor = vscode.window.activeTextEditor): string {
  if (!editor || !vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length < 1) { return ''; }
  const resource = editor.document.uri;
  if (resource.scheme === 'vscode-notebook-cell') {
    let filePath = resource.fsPath;
    let root = vscode.workspace.workspaceFolders.find(f => filePath.indexOf(f.uri.fsPath) >= 0);
    if (root) { return root.uri.fsPath; }
    else { return ''; };
  }
  if (resource.scheme !== 'file' && resource.scheme !== 'vscode-remote') { return ''; }
  const folder = vscode.workspace.getWorkspaceFolder(resource);
  if (!folder) { return ''; }
  return folder.uri.fsPath;
}

function getEditorFilePath (editor = vscode.window.activeTextEditor): string {
  if (!editor || !vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length < 1) { return ''; }
  return editor.document.uri.fsPath;
}

// 获取编辑器相对路径
function getRelativePath (editor = vscode.window.activeTextEditor) {
  if (!editor || !vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length < 1) { return ''; }
  return path.relative(getEditorRoot(editor), getEditorFilePath(editor));
}
  
function sleep (time: number) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

function confirm (message: string, options: string[]): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    return vscode.window.showInformationMessage(message, ...options).then(resolve);
  });
}

function prompt (message: string, defaultVal: string = ''): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    return vscode.window.showInputBox({
      value: defaultVal,
      prompt: message
    }).then(resolve);
  });
}

function hash (buffer: Buffer | string): string {
  let sha256 = crypto.createHash('sha256');
  let hash = sha256.update(buffer).digest('hex');
  return hash;
}

function getOpenCmd (): string {
  let cmd = 'start';
  if (process.platform === 'win32') {
    cmd = 'start';
  } else if (process.platform === 'linux') {
    cmd = 'xdg-open';
  } else if (process.platform === 'darwin') {
    cmd = 'open';
  }
  return cmd;
}

function getLineContent(lineNumber: number, editor: vscode.TextEditor | undefined = vscode.window.activeTextEditor) {
  if (editor) {
      const line = editor.document.lineAt(lineNumber);
      return line.text;
  }
  return null;
}

async function replaceText(range: vscode.Range, newText: string, editor: vscode.TextEditor | undefined = vscode.window.activeTextEditor) {
  if (editor) {
      const oldEnd = range.end;
      const oldText = editor.document.getText(range);
      await editor.edit(editBuilder => {
          editBuilder.replace(range, newText);
      });
      const newLines = newText.split('\n');
      const oldLines = oldText.split('\n');
      const lineOffset = newLines.length - oldLines.length;
      const characterOffset = newLines[newLines.length - 1].length - oldLines[oldLines.length - 1].length;
      return {
        lineOffset,
        characterOffset
      };
  }
}

function goToLine(lineNumber: number, editor: vscode.TextEditor | undefined = vscode.window.activeTextEditor) {
  if (editor) {
    const range = editor.document.lineAt(lineNumber).range;
    editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
  }
}

function hoverText(text: string) {
  const hoverMessage = new vscode.MarkdownString(text, true);
  hoverMessage.isTrusted = true;
  return new vscode.Hover(hoverMessage);
}

function getEditorByDoc(document?: vscode.TextDocument): vscode.TextEditor | undefined {
  for (let editor of vscode.window.visibleTextEditors) {
      if (editor.document === document) {
          return editor;
      }
  }
  return undefined;
}

function getConfig () {
  let keys: string[] = Object.keys(pkg.contributes.configuration.properties);
  let values: Config = {};
  function toVal(str: string, val: string|undefined, cfg: Config) : string | Config {
      let keys = str.split('.');
      if (keys.length === 1) {
          cfg[keys[0]] = val;
      } else {
          cfg[keys[0]] = toVal(keys.slice(1).join('.'), val, cfg[keys[0]] || {});
      }
      return cfg;
  }
  keys.forEach(k => toVal(k.split('.').slice(1).join('.'), vscode.workspace.getConfiguration().get(k), values));
  return values;
}

function setConfig(key: string, value: any) {
  let keys: string[] = Object.keys(pkg.contributes.configuration.properties);
  const realKey = keys.find(k => k.split('.').slice(1).join('.') === key);
  if (!realKey) { return; }
  return vscode.workspace.getConfiguration().update(realKey, value, true);
}

function getPasteImage (imagePath: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
      if (!imagePath) { return; }

      let platform = process.platform;
      if (platform === 'win32') {
          // Windows
          const scriptPath = path.join(__dirname, '..', '..', 'assets/pc.ps1');

          let command = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
          let powershellExisted = fs.existsSync(command);
          let output = '';
          if (!powershellExisted) {
              command = "powershell";
          }

          const powershell = spawn(command, [
              '-noprofile',
              '-noninteractive',
              '-nologo',
              '-sta',
              '-executionpolicy', 'unrestricted',
              '-windowstyle', 'hidden',
              '-file', scriptPath,
              imagePath
          ]);
          // the powershell can't auto exit in windows 7 .
          let timer = setTimeout(() => powershell.kill(), 10000);

          powershell.on('error', (e: any) => {
              if (e.code === 'ENOENT') {
                  vscode.window.showErrorMessage('The powershell command is not in you PATH environment variables. Please add it and retry.');
              } else {
                  vscode.window.showErrorMessage(e);
              }
          });

          powershell.on('exit', function (code, signal) {
              // console.debug('exit', code, signal);
          });
          powershell.stdout.on('data', (data) => {
              data.toString().split('\n').forEach((d: string) => output += (d.indexOf('Active code page:') < 0 ? d + '\n' : ''));
              clearTimeout(timer);
              timer = setTimeout(() => powershell.kill(), 10000);
          });
          powershell.on('close', (code) => {
              resolve(output.trim().split('\n').map(i => i.trim()));
          });
      }
      else if (platform === 'darwin') {
          // Mac
          let scriptPath = path.join(__dirname, '..', '..', 'assets/mac.applescript');

          let ascript = spawn('osascript', [scriptPath, imagePath]);
          ascript.on('error', (e: any) => {
              vscode.window.showErrorMessage(e);
          });
          ascript.on('exit', (code, signal) => {
              // console.debug('exit', code, signal);
          });
          ascript.stdout.on('data', (data) => {
              resolve(data.toString().trim().split('\n'));
          });
      } else {
          // Linux

          let scriptPath = path.join(__dirname, '..', '..', 'assets/linux.sh');

          let ascript = spawn('sh', [scriptPath, imagePath]);
          ascript.on('error', (e: any) => {
              vscode.window.showErrorMessage(e);
          });
          ascript.on('exit', (code, signal) => {
              // console.debug('exit',code,signal);
          });
          ascript.stdout.on('data', (data) => {
              let result = data.toString().trim();
              if (result === "no xclip") {
                  vscode.window.showInformationMessage('You need to install xclip command first.');
                  return;
              }
              let match = decodeURI(result).trim().match(/((\/[^\/]+)+\/[^\/]*?\.(jpg|jpeg|gif|bmp|png))/g);
              resolve(match || []);
          });
      }
  });
}

function getTmpFolder () {
  let savePath = path.join(tmpdir(), pkg.name);
  if (!fs.existsSync(savePath)) { fs.mkdirSync(savePath); }
  return savePath;
}

// 通过 dev 文件夹是否存在来判断现在是打包模式还是开发模式
const isDevMode = fs.existsSync(path.resolve(__dirname, '..', '..', 'dev'));

export {
  downloadFile,
  showProgress,
  editorEdit,
  insertToEnd,
  mkdirs,
  openFile,
  openFolder,
  highlightText,
  getSelections,
  getSelectionByPosition,
  getEditorRoot,
  getEditorFilePath,
  getRelativePath,
  getEditorByDoc,
  sleep,
  confirm,
  prompt,
  hash,
  getOpenCmd,
  getLineContent,
  replaceText,
  goToLine,
  hoverText,
  getConfig,
  setConfig,
  getPasteImage,
  getTmpFolder,
  isDevMode
};
