import { useState } from 'react';
import { useAIStore } from '../stores/useAIStore';
import type { AIProviderType } from '../types';
import { isCryptoAvailable } from '../utils/crypto';

interface ProviderSetupModalProps {
  onComplete: () => void;
}

const PROVIDER_OPTIONS: { type: AIProviderType; label: string; description: string }[] = [
  { type: 'openai', label: 'OpenAI', description: 'GPT-4o / GPT-4o-mini' },
  { type: 'anthropic', label: 'Anthropic', description: 'Claude 3.5 / 3 Haiku' },
  { type: 'custom', label: '自定义兼容', description: 'OpenAI 兼容 API（如 DeepSeek、通义千问）' },
];

export default function ProviderSetupModal({ onComplete }: ProviderSetupModalProps) {
  const addProvider = useAIStore((s) => s.addProvider);

  const [providerType, setProviderType] = useState<AIProviderType>('openai');
  const [apiKey, setApiKey] = useState('');
  const [baseURL, setBaseURL] = useState('');
  const [model, setModel] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');

    if (!apiKey.trim()) {
      setError('请输入 API Key');
      return;
    }

    if (!isCryptoAvailable()) {
      setError('您的浏览器不支持安全加密，请使用最新版 Chrome/Firefox/Edge');
      return;
    }

    setIsSaving(true);
    try {
      await addProvider({
        type: providerType,
        name: PROVIDER_OPTIONS.find((o) => o.type === providerType)?.label || '自定义',
        apiKey: apiKey.trim(),
        baseURL: providerType === 'custom' ? baseURL.trim() || undefined : undefined,
        model: model.trim() || undefined,
        isDefault: true,
      });
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100">
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
        <div className="px-6 py-4 space-y-4">
          {/* Provider type selection */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">选择 AI 提供商</label>
            <div className="grid grid-cols-3 gap-2">
              {PROVIDER_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => setProviderType(opt.type)}
                  className={`p-3 rounded-xl border-2 text-center transition-all duration-200 ${
                    providerType === opt.type
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className={`text-sm font-medium ${providerType === opt.type ? 'text-blue-700' : 'text-gray-700'}`}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={providerType === 'openai' ? 'sk-...' : providerType === 'anthropic' ? 'sk-ant-...' : '输入 API Key'}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-1">
              Key 将加密存储在浏览器本地，不会上传到任何服务器
            </p>
          </div>

          {/* Custom provider fields */}
          {providerType === 'custom' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">API 端点 URL</label>
                <input
                  type="text"
                  value={baseURL}
                  onChange={(e) => setBaseURL(e.target.value)}
                  placeholder="https://api.deepseek.com/v1"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">模型名称（可选）</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="deepseek-chat"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                />
              </div>
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
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={handleSkip}
            className="flex-1 py-2.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200"
          >
            跳过，稍后配置
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !apiKey.trim()}
            className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? '保存中...' : '保存并开始使用'}
          </button>
        </div>
      </div>
    </div>
  );
}
