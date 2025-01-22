import querystring from 'querystring';
import { getConfig } from './utils';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fetch from 'node-fetch';
import FormData from "form-data";

export interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  params: Record<string, string | number | boolean>;
  data: any;
}

export class defHttp {
  public static token: string = '';
  static get<T>(url: string, params: Record<string, string | number | boolean> = {}) {
    return this.request<T>(url, { method: 'GET', params, data: {} });
  }
  static post<T>(url: string, data: any = {}) {
    return this.request<T>(url, { method: 'POST', params: {}, data });
  }
  static request<T>(url: string, options: RequestOptions): Promise<T> {
    const config = getConfig();
    url = config.server + url + (url.includes('?') ? '&' : '?') + querystring.stringify(options.params);
    let agent = undefined;
    if (config.proxy) agent = url.startsWith('http://') ? new HttpProxyAgent(config.proxy) : new HttpsProxyAgent(config.proxy);
    const body = options.method != 'GET' ? (options.data instanceof FormData ? options.data : JSON.stringify(options.data)) : undefined;
    const headers: any = typeof body == 'string' ? { 'Content-Type': 'application/json' } : {};
    return new Promise((resolve, reject) => {
      fetch(url, {
        method: options.method,
        headers: {
          'Authorization': this.token,
          ...headers
        },
        body,
        agent: agent
      })
      .then(rsp => rsp.json())
      .then((rsp: any) => {
        if (rsp.code !== 200) {
          reject(new Error(rsp.message));
        }
        return rsp.data;
      }).then(data => {
        resolve(data);
      });
    });
  }
}