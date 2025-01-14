# Wechat 扩展服务端

这是用于 Wechat 客户端的扩展服务端。需搭配 gewechat docker 使用，具体见 https://github.com/Devo919/Gewechat 或 https://github.com/mikoshu/gewechaty 

> 服务端需在与 Docker 同网络环境运行。

## 使用

```bash
# 安装依赖
npm ci
# 配置数据库
npm run initdb
# 启动服务
npm run start
```

守护进程启动

```
npm i -g pm2
pm2 start -n "wechaty" npm -- start
```

启动后，先查看控制台二维码，扫码登录微信。

然后访问 http://localhost:3333 初始化服务。需配置二次验证码，用于 VSCode 扩展登录。

> 接口服务端口为  `3333`，实时消息通过 Websocket ，端口为 3334。

## 云朵备份

服务器依赖[云朵备份](https://github.com/likeflyme/cloudbak)的联系人列表，可以包含完整联系人。在配置好云朵备份后，再运行 `npm run sync` 同步聊天记录与联系人。

若不同步，则可能会导致联系人列表不完整。

> *建议使用！