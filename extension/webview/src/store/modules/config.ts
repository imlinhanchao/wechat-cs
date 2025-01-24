import { defineStore } from 'pinia';
import { store } from '@/store';
import { useMessage } from '@/hooks/useMessage';

const { invoke } = useMessage();

export const useConfigStore = defineStore('config', {
  state: (): any => ({
    config: null,
    me: null
  }),
  getters: {
    getConfig(): any {
      return this.config || {};
    },
    getMe(): IUser {
      return this.me || {};
    }
  },
  actions: {
    loginInit() {
      return Promise.all([
        invoke('config').then((data) => {
          this.config = data;
        }),
        invoke('info').then((data) => {
          if (data) this.me = data;
        })
      ]);
    }
  }
});

// Need to be used outside the setup
export function useConfigStoreWithOut() {
  return useConfigStore(store);
}
