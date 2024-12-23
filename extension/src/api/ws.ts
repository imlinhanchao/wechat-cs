import ReconnectingWebSocket from "reconnecting-websocket";
import { getConfig } from "../lib/utils";
import WS from 'ws';

export class ChatWs {
  rws: ReconnectingWebSocket;
  listeners: Function[] = [];

  constructor(token: string) {
    const { websocket } = getConfig();
    this.rws = new ReconnectingWebSocket(`${websocket}?token=${token}`, [], {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      WebSocket: WS,
      connectionTimeout: 10000
    });

    this.rws.onopen = (e) => {
      console.log("onopen");
    };
    this.rws.onmessage = (e) => {
      this.onMessage(e);
    };
    this.rws.onerror = (e) => {};
    this.rws.onclose = (e) => {};
  }

  onMessage(e: any) {
    const msg = JSON.parse(e.data);

    this.listeners.forEach((fn) => {
      fn(msg);
    });
  }

  addListener(fn: Function) {
    this.listeners.push(fn);
  }

  removeListener(fn: Function) {
    this.listeners = this.listeners.filter((f) => f !== fn);
  }
}
