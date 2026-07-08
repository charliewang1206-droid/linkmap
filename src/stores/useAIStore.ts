import { create } from 'zustand';
import { db } from '../db';
import { generateId, now, type AIProviderConfig, type AIProviderType } from '../types';
import { encryptAPIKey } from '../utils/crypto';

interface AIState {
  providers: AIProviderConfig[];
  isLoading: boolean;
  loadProviders: () => Promise<void>;
  addProvider: (data: { type: AIProviderType; name: string; apiKey: string; baseURL?: string; model?: string; isDefault?: boolean }) => Promise<AIProviderConfig>;
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

  addProvider: async (data) => {
    const { encrypted, iv } = await encryptAPIKey(data.apiKey);
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
