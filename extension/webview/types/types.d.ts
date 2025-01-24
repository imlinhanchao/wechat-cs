declare interface IData {
  name: string;
  age: number;
}

/**
 * 微信用户信息
 */
declare interface IUser {
  /**
   * 微信号
   */
  alias: string;
  /**
   * 微信id
   */
  wxid: string;
  /**
   * 昵称
   */
  nickName: string;
  /**
   * 电话
   */
  mobile: string;
  /**
   * QQ
   */
  uin: number;
  /**
   * 性别
   */
  sex: number;
  /**
   * 省份
   */
  province: string;
  /**
   * 城市
   */
  city: string;
  /**
   * 签名
   */
  signature: string;
  /**
   * 国家
   */
  country: string;
  /**
   * 头像（大）
   */
  bigHeadImgUrl: string;
  /**
   * 头像（小）
   */
  smallHeadImgUrl: string;
  /**
   * 注册国家
   */
  regCountry: string;
  /**
   * 朋友圈背景图
   */
  snsBgImg: string;
}

declare interface IContact {
  id: string;
  wxid: string;
  nickname: string;
  avatar: string;
  remark: string;
  last_chat_time: number;
  msgs: IMessage[];
}

declare interface IWechatContact {
  alias: string;
  avatarUrl: string;
  name: string;
  type: string;
  gender: string;
  province: string;
  city: string;
  self: string;
  id: string;
}

declare interface IMessage {
  id: string;
  type: string;
  data: string | any;
  from: IWechatContact;
  in: IWechatContact;
  isRoom: boolean;
  self: boolean;
  date: string;
  age: number;
  isReaded?: boolean;
  isRevoke?: boolean;
}

declare interface IRoomMember {
  wxid: string;
  nickName: string;
  inviterUserName?: string;
  memberFlag: number;
  displayName: any;
  bigHeadImgUrl: any;
  smallHeadImgUrl: any;
}

declare interface IRoom {
  chatroomId: string;
  name: string;
  remark: string;
  chatRoomNotify: any;
  chatRoomOwner: string;
  isNotify: boolean;
  OwnerId: string;
  avatarImg: string;
  memberList: IRoomMember[];
}

declare interface IEmoji {
  md5: string;
  size: number;
  url: string;
}
