import { useState, useEffect } from 'react';
import { useAIStore } from '../stores/useAIStore';
import { FREE_PROVIDER_PRESETS, type AIProviderConfig, type AIProviderType } from '../types';
import { isCryptoAvailable, encryptAPIKey } from '../utils/crypto';
import { isWebGPUSupported } from '../utils/webllm';

interface ProviderSetupModalProps {
  onComplete: () => void;
  /** setup: 首次启动引导；manage: 随时调整配置 */
  mode?: 'setup' | 'manage';
}

type Choice =
  | { kind: 'local' }
  | { kind: 'ollama' }
  | { kind: 'free'; key: keyof typeof FREE_PROVIDER_PRESETS }
  | { kind: 'paid'; type: 'openai' | 'anthropic' };

const CHOICES: { id: Choice; label: string; description: string; badge?: string }[] = [
  {
    id: { kind: 'local' },
    label: '本地模型 (免费)',
    description: '浏览器内运行，无需 Key、不联网、隐私最佳',
    badge: '推荐',
  },
  {
    id: { kind: 'free', key: 'deepseek' },
    label: 'DeepSeek',
    description: FREE_PROVIDER_PRESETS.deepseek.description,
    badge: '免费额度',
  },
  {
    id: { kind: 'free', key: 'qwen' },
    label: '通义千问',
    description: FREE_PROVIDER_PRESETS.qwen.description,
  },
  {
    id: { kind: 'free', key: 'glm' },
    label: '智谱 GLM',
    description: FREE_PROVIDER_PRESETS.glm.description,
  },
  {
    id: { kind: 'ollama' },
    label: '本地 Ollama',
    description: FREE_PROVIDER_PRESETS.ollama.description,
  },
  {
    id: { kind: 'paid', type: 'openai' },
    label: 'OpenAI',
    description: 'GPT-4o / 4o-mini (付费)',
  },
  {
    id: { kind: 'paid', type: 'anthropic' },
    label: 'Anthropic',
    description: 'Claude 3.5 / 3 Haiku (付费)',
  },
];

function choiceKey(c: Choice): string {
  if (c.kind === 'local') return 'local';
  if (c.kind === 'ollama') return 'ollama';
  if (c.kind === 'free') return `free-${c.key}`;
  return `paid-${c.type}`;
}

/** 将已保存的 provider 反向映射回选项，用于 manage 模式预填 */
function providerToChoice(p: AIProviderConfig): Choice {
  if (p.type === 'local') return { kind: 'local' };
  if (p.type === 'ollama') return { kind: 'ollama' };
  if (p.type === 'openai') return { kind: 'paid', type: 'openai' };
  if (p.type === 'anthropic') return { kind: 'paid', type: 'anthropic' };
  // custom：尝试匹配免费预设
  const matched = (Object.keys(FREE_PROVIDER_PRESETS) as (keyof typeof FREE_PROVIDER_PRESETS)[]).find(
    (k) => FREE_PROVIDER_PRESETS[k].baseURL === p.baseURL
  );
  return { kind: 'free', key: matched ?? 'deepseek' };
}

export default function ProviderSetupModal({ onComplete, mode = 'setup' }: ProviderSetupModalProps) {
  const addProvider = useAIStore((s) => s.addProvider);
  const updateProvider = useAIStore((s) => s.updateProvider);
  const getDefaultProvider = useAIStore((s) => s.getDefaultProvider);
  const providers = useAIStore((s) => s.providers);

  const [choice, setChoice] = useState<Choice>({ kind: 'local' });
  const [apiKey, setApiKey] = useState('');
  const [ollamaURL, setOllamaURL] = useState<string>(FREE_PROVIDER_PRESETS.ollama.baseURL);
  const [ollamaModel, setOllamaModel] = useState<string>(FREE_PROVIDER_PRESETS.ollama.model);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // manage 模式：用当前默认 provider 预填表单
  useEffect(() => {
    if (mode !== 'manage') return;
    const current = getDefaultProvider();
    if (!current) return;
    setChoice(providerToChoice(current));
    if (current.type === 'ollama') {
      setOllamaURL(current.baseURL ?? FREE_PROVIDER_PRESETS.ollama.baseURL);
      setOllamaModel(current.model ?? FREE_PROVIDER_PRESETS.ollama.model);
    }
    // 加密的 Key 不回显，留空表示保留原 Key
    setApiKey('');
  }, [mode]);

  const needsApiKey = choice.kind === 'paid' || choice.kind === 'free';
  const needsOllamaConfig = choice.kind === 'ollama';

  /** 根据当前选项构建 provider 基础字段 */
  function buildBaseData(): { type: AIProviderType; name: string; baseURL?: string; model?: string } {
    if (choice.kind === 'local') return { type: 'local', name: '本地模型' };
    if (choice.kind === 'ollama')
      return { type: 'ollama', name: '本地 Ollama', baseURL: ollamaURL.trim(), model: ollamaModel.trim() };
    if (choice.kind === 'free') {
      const preset = FREE_PROVIDER_PRESETS[choice.key];
      return { type: 'custom', name: preset.label, baseURL: preset.baseURL, model: preset.model };
    }
    return { type: choice.type, name: choice.type === 'openai' ? 'OpenAI' : 'Anthropic' };
  }

  const handleSave = async () => {
    setError('');

    if (needsApiKey && !apiKey.trim() && mode === 'setup') {
      setError('请输入 API Key');
      return;
    }
    if (choice.kind === 'paid' && !isCryptoAvailable()) {
      setError('您的浏览器不支持安全加密，请使用最新版 Chrome/Firefox/Edge');
      return;
    }
    if (choice.kind === 'local' && !isWebGPUSupported()) {
      setError('当前浏览器不支持 WebGPU，无法运行本地模型。请改用其他方案。');
      return;
    }

    setIsSaving(true);
    try {
      const base = buildBaseData();
      const existing = mode === 'manage' ? getDefaultProvider() : undefined;

      if (existing) {
        // 更新已有默认 provider
        const patch: Partial<AIProviderConfig> = { ...base, isDefault: true };
        if (needsApiKey && apiKey.trim()) {
          const { encrypted, iv } = await encryptAPIKey(apiKey.trim());
          patch.apiKeyEncrypted = encrypted;
          patch.apiKeyIV = iv;
        } else if (!needsApiKey) {
          // 本地/Ollama 无需 Key，清空可能存在的旧密文
          patch.apiKeyEncrypted = '';
          patch.apiKeyIV = '';
        }
        await updateProvider(existing.id, patch);
      } else {
        await addProvider({
          ...base,
          apiKey: needsApiKey ? apiKey.trim() : undefined,
          isDefault: true,
        });
      }
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const currentName = providers.find((p) => p.isDefault)?.name ?? providers[0]?.name;
  const isManage = mode === 'manage';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}>
                <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {isManage ? 'AI 设置' : '配置 AI 助手'}
              </h2>
              <p className="text-xs text-gray-400">
                {isManage
                  ? '随时更换或调整 AI 方案'
                  : '连接 AI 后可使用智能批量导入功能'}
              </p>
            </div>
          </div>
          {isManage && currentName && (
            <p className="text-xs text-gray-500 mt-1">
              当前方案：<span className="font-medium text-gray-700">{currentName}</span>
            </p>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4 overflow-y-auto">
          {/* Choice list */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">选择 AI 方案</label>
            <div className="space-y-2">
              {CHOICES.map((opt) => {
                const key = choiceKey(opt.id);
                const selected = choiceKey(choice) === key;
                return (
                  <button
                    key={key}
                    onClick={() => setChoice(opt.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border-2 text-left transition-all duration-200 ${
                      selected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div>
                      <p className={`text-sm font-medium ${selected ? 'text-blue-700' : 'text-gray-800'}`}>
                        {opt.label}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{opt.description}</p>
                    </div>
                    {opt.badge && (
                      <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                        opt.badge === '推荐' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {opt.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* API Key (paid / free) */}
          {needsApiKey && (
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={isManage ? '留空则保留当前 Key' : '粘贴你的 API Key'}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                autoFocus={isManage}
              />
              <p className="text-xs text-gray-400 mt-1">
                Key 将加密存储在浏览器本地，不会上传到任何服务器
              </p>
            </div>
          )}

          {/* Ollama config */}
          {needsOllamaConfig && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Ollama 地址</label>
                <input
                  type="text"
                  value={ollamaURL}
                  onChange={(e) => setOllamaURL(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">模型名称</label>
                <input
                  type="text"
                  value={ollamaModel}
                  onChange={(e) => setOllamaModel(e.target.value)}
                  placeholder="qwen2.5:0.5b"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                />
                <p className="text-xs text-gray-400 mt-1">
                  需先在本地运行 <code className="bg-gray-100 px-1 rounded">ollama run {ollamaModel}</code>
                </p>
              </div>
            </div>
          )}

          {/* Local note */}
          {choice.kind === 'local' && (
            <div className="px-3 py-2 bg-green-50 border border-green-100 rounded-lg">
              <p className="text-xs text-green-700">
                首次解析会自动下载约 500MB 模型到浏览器缓存，之后完全离线运行。需要支持 WebGPU 的浏览器（Chrome / Edge 最新版）。
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">
          <button
            onClick={onComplete}
            className="flex-1 py-2.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200"
          >
            {isManage ? '关闭' : '跳过，稍后配置'}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || (needsApiKey && !apiKey.trim() && mode === 'setup')}
            className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? '保存中...' : isManage ? '保存' : '保存并开始使用'}
          </button>
        </div>
      </div>
    </div>
  );
}
