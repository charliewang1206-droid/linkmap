import { create } from 'zustand';
import { db } from '../db';
import { generateId, now, type AIProviderConfig, type AIProviderType } from '../types';
import { encryptAPIKey } from '../utils/crypto';

// 内置默认硅基流动 API Key（免费额度，服务所有用户零门槛上手）。
// 每月 200 万 Token 免费，用户也可在「AI 设置」中替换为自己的 Key。
const BUILTIN_SILICONFLOW_KEY = 'sk-yblbdbmuxefbdttxmceyltpildlhujzbjndcpynycnqdrkwi';
const BUILTIN_PROVIDER_ID = 'builtin-siliconflow';

interface AIState {
  providers: AIProviderConfig[];
  isLoading: boolean;
  loadProviders: () => Promise<void>;
  initDefaultProvider: () => Promise<void>;
  addProvider: (data: { type: AIProviderType; name: string; apiKey?: string; baseURL?: string; model?: string; isDefault?: boolean }) => Promise<AIProviderConfig>;
  updateProvider: (id: string, data: Partial<AIProviderConfig>) => Promise<void>;
  deleteProvider: (id: string) => Promise<void>;
  getDefaultProvider: () => AIProviderConfig | undefined;
  hasAnyProvider: () => boolean;
}

export const useAIStore = create<AIState>((set, get) => ({
  providers: [],
  isLoading: false,

  loadProviders: async () => {
    set({ isLoading: true });
    try {
      const providers = await db.aiProviders.toArray();
      set({ providers });
    } finally {
      set({ isLoading: false });
    }
  },

  /** 首次启动时自动创建内置硅基流动 provider，确保开箱即用 */
  initDefaultProvider: async () => {
    const existing = await db.aiProviders.get(BUILTIN_PROVIDER_ID);
    if (existing) {
      // 内置 provider 已存在，更新 key（防止旧 key 泄露后需要替换）
      const { encrypted, iv } = await encryptAPIKey(BUILTIN_SILICONFLOW_KEY);
      await db.aiProviders.update(BUILTIN_PROVIDER_ID, {
        apiKeyEncrypted: encrypted,
        apiKeyIV: iv,
        updatedAt: now(),
      });
    } else {
      const { encrypted, iv } = await encryptAPIKey(BUILTIN_SILICONFLOW_KEY);
      const provider: AIProviderConfig = {
        id: BUILTIN_PROVIDER_ID,
        type: 'custom',
        name: '硅基流动 (内置)',
        apiKeyEncrypted: encrypted,
        apiKeyIV: iv,
        baseURL: 'https://api.siliconflow.cn/v1',
        model: 'deepseek-ai/DeepSeek-V4-Flash',
        isDefault: true,
        createdAt: now(),
        updatedAt: now(),
      };
      await db.aiProviders.add(provider);
    }
    const providers = await db.aiProviders.toArray();
    set({ providers });
  },

  addProvider: async (data) => {
    // Local & Ollama providers need no API key — store empty ciphertext.
    const needsKey = data.type !== 'local' && data.type !== 'ollama';
    const { encrypted, iv } = needsKey && data.apiKey
      ? await encryptAPIKey(data.apiKey)
      : { encrypted: '', iv: '' };

    const provider: AIProviderConfig = {
      id: generateId(),
      type: data.type,
      name: data.name,
      apiKeyEncrypted: encrypted,
      apiKeyIV: iv,
      baseURL: data.baseURL,
      model: data.model,
      isDefault: data.isDefault ?? false,
      createdAt: now(),
      updatedAt: now(),
    };

    // If this is default, unset other defaults
    if (provider.isDefault) {
      const existingDefaults = await db.aiProviders.filter(p => p.isDefault).toArray();
      for (const p of existingDefaults) {
        await db.aiProviders.update(p.id, { isDefault: false });
      }
    }

    await db.aiProviders.add(provider);
    const providers = await db.aiProviders.toArray();
    set({ providers });
    return provider;
  },

  updateProvider: async (id, data) => {
    await db.aiProviders.update(id, { ...data, updatedAt: now() });
    const providers = await db.aiProviders.toArray();
    set({ providers });
  },

  deleteProvider: async (id) => {
    await db.aiProviders.delete(id);
    const providers = await db.aiProviders.toArray();
    set({ providers });
  },

  getDefaultProvider: () => {
    return get().providers.find((p) => p.isDefault) || get().providers[0];
  },

  hasAnyProvider: () => {
    return get().providers.length > 0;
  },
}));
