import { create } from 'zustand';
import axios from 'axios';
import Cookies from 'js-cookie';

// 定义服务器对象类型
export interface Server {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'starting' | 'stopping';
}

// 定义服务器状态类型
interface ServersState {
  servers: Server[];
  isLoading: boolean;
  error: string | null;
  imageStatus: ImageStatus | null;
  actions: ServersActions;
}

export interface ImageStatus {
    can_create_server: boolean;
    can_start_server: boolean;
    any_pulling: boolean;
}

// 定义服务器操作类型
interface ServersActions {
  fetchServers: () => Promise<void>;
  createServer: (serverData: Partial<Server>) => Promise<Server>;
  updateServer: (serverId: string, updateData: Partial<Server>) => Promise<Server>;
  deleteServer: (serverId: string) => Promise<void>;
  getServer: (serverId: string) => Promise<Server>;
  getImageStatus: () => Promise<void>;
  startServer: (serverId: string) => Promise<void>;
  stopServer: (serverId: string) => Promise<void>;
  updateServerStatus: (serverId: string, status: Server['status']) => void;
}

const getAuthHeaders = () => {
    const token = Cookies.get('auth-token');
    if (!token) {
        throw new Error('未找到认证token');
    }
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
};

const useServersStore = create<ServersState>((set, get) => ({
  servers: [],
  isLoading: false,
  error: null,
  imageStatus: null,
  actions: {
    fetchServers: async () => {
      set({ isLoading: true, error: null });
      try {
        const response = await axios.get('/api/servers', { headers: getAuthHeaders() });
        set({ servers: response.data.data || [] });
      } catch (error: any) {
        set({ error: '获取服务器列表失败' });
        throw error;
      } finally {
        set({ isLoading: false });
      }
    },
    createServer: async (serverData) => {
        try {
            const response = await axios.post('/api/servers', serverData, { headers: getAuthHeaders() });
            const newServer = response.data.data;
            set((state) => ({ servers: [...state.servers, newServer] }));
            return newServer;
        } catch (error: any) {
            set({ error: '创建服务器失败' });
            throw error;
        }
    },
    updateServer: async (serverId, updateData) => {
        try {
            const response = await axios.put(`/api/servers/${serverId}`, updateData, { headers: getAuthHeaders() });
            const updatedServer = response.data.data;
            set((state) => ({
                servers: state.servers.map((s) => (s.id === serverId ? updatedServer : s)),
            }));
            return updatedServer;
        } catch (error: any) {
            set({ error: '更新服务器失败' });
            throw error;
        }
    },
    deleteServer: async (serverId) => {
        try {
            await axios.delete(`/api/servers/${serverId}`, { headers: getAuthHeaders() });
            set((state) => ({
                servers: state.servers.filter((s) => s.id !== serverId),
            }));
        } catch (error: any) {
            set({ error: '删除服务器失败' });
            throw error;
        }
    },
    getServer: async (serverId) => {
        try {
            const response = await axios.get(`/api/servers/${serverId}`, { headers: getAuthHeaders() });
            return response.data.data;
        } catch (error: any) {
            set({ error: '获取服务器信息失败' });
            throw error;
        }
    },
    getImageStatus: async () => {
        try {
            const response = await axios.get('/api/servers/images/status', { headers: getAuthHeaders() });
            set({ imageStatus: response.data.data });
        } catch (error: any) {
            set({ error: '获取镜像状态失败' });
            throw error;
        }
    },
    startServer: async (serverId) => {
        try {
            await axios.post(`/api/servers/${serverId}/start`, {}, { headers: getAuthHeaders() });
            get().actions.updateServerStatus(serverId, 'starting');
            setTimeout(() => get().actions.updateServerStatus(serverId, 'running'), 3000);
        } catch (error: any) {
            set({ error: '启动服务器失败' });
            throw error;
        }
    },
    stopServer: async (serverId) => {
        try {
            await axios.post(`/api/servers/${serverId}/stop`, {}, { headers: getAuthHeaders() });
            get().actions.updateServerStatus(serverId, 'stopping');
            setTimeout(() => get().actions.updateServerStatus(serverId, 'stopped'), 2000);
        } catch (error: any) {
            set({ error: '停止服务器失败' });
            throw error;
        }
    },
    updateServerStatus: (serverId, status) => {
        set((state) => ({
            servers: state.servers.map((s) => (s.id === serverId ? { ...s, status } : s)),
        }));
    },
  },
}));

export const useServers = () => useServersStore((state) => state.servers);
export const useServersIsLoading = () => useServersStore((state) => state.isLoading);
export const useServersError = () => useServersStore((state) => state.error);
export const useImageStatus = () => useServersStore((state) => state.imageStatus);
export const useServersActions = () => useServersStore((state) => state.actions);

export default useServersStore;