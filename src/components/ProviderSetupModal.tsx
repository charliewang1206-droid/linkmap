import { useState } from 'react';
import { useAIStore } from '../stores/useAIStore';
import { FREE_PROVIDER_PRESETS } from '../types';
import { isCryptoAvailable } from '../utils/crypto';
import { isWebGPUSupported } from '../utils/webllm';

interface ProviderSetupModalProps {
  onComplete: () => void;
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

export default function ProviderSetupModal({ onComplete }: ProviderSetupModalProps) {
  const addProvider = useAIStore((s) => s.addProvider);

  const [choice, setChoice] = useState<Choice>({ kind: 'local' });
  const [apiKey, setApiKey] = useState('');
  const [ollamaURL, setOllamaURL] = useState<string>(FREE_PROVIDER_PRESETS.ollama.baseURL);
  const [ollamaModel, setOllamaModel] = useState<string>(FREE_PROVIDER_PRESETS.ollama.model);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const needsApiKey = choice.kind === 'paid' || choice.kind === 'free';
  const needsOllamaConfig = choice.kind === 'ollama';

  const handleSave = async () => {
    setError('');

    if (needsApiKey && !apiKey.trim()) {
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
      if (choice.kind === 'local') {
        await addProvider({ type: 'local', name: '本地模型', isDefault: true });
      } else if (choice.kind === 'ollama') {
        await addProvider({
          type: 'ollama',
          name: '本地 Ollama',
          baseURL: ollamaURL.trim(),
          model: ollamaModel.trim(),
          isDefault: true,
        });
      } else if (choice.kind === 'free') {
        const preset = FREE_PROVIDER_PRESETS[choice.key];
        await addProvider({
          type: 'custom',
          name: preset.label,
          apiKey: apiKey.trim(),
          baseURL: preset.baseURL,
          model: preset.model,
          isDefault: true,
        });
      } else {
        // paid
        await addProvider({
          type: choice.type,
          name: choice.type === 'openai' ? 'OpenAI' : 'Anthropic',
          apiKey: apiKey.trim(),
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

  const handleSkip = () => onComplete();

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
              <h2 className="text-lg font-semibold text-gray-900">配置 AI 助手</h2>
              <p className="text-xs text-gray-400">连接 AI 后可使用智能批量导入功能</p>
            </div>
          </div>
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
                placeholder="粘贴你的 API Key"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                autoFocus
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
            onClick={handleSkip}
            className="flex-1 py-2.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200"
          >
            跳过，稍后配置
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || (needsApiKey && !apiKey.trim())}
            className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? '保存中...' : '保存并开始使用'}
          </button>
        </div>
      </div>
    </div>
  );
}
