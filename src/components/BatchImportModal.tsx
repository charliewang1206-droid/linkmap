import { useState, useRef } from 'react';
import { useAIStore } from '../stores/useAIStore';
import { usePersonStore } from '../stores/usePersonStore';
import { useRelationStore } from '../stores/useRelationStore';
import { useViewStore } from '../stores/useViewStore';
import { parseWithAI } from '../utils/ai-parser';
import { onLocalModelProgress } from '../utils/webllm';
import type { BatchImportResult, ParsedPerson, ParsedRelation } from '../types';

interface BatchImportModalProps {
  onClose: () => void;
}

export default function BatchImportModal({ onClose }: BatchImportModalProps) {
  const getDefaultProvider = useAIStore((s) => s.getDefaultProvider);
  const addPerson = usePersonStore((s) => s.addPerson);
  const persons = usePersonStore((s) => s.persons);
  const addRelation = useRelationStore((s) => s.addRelation);
  const currentViewId = useViewStore((s) => s.currentViewId);

  const [step, setStep] = useState<'input' | 'parsing' | 'preview' | 'confirming'>('input');
  const [text, setText] = useState('');
  const [result, setResult] = useState<BatchImportResult | null>(null);
  const [error, setError] = useState('');
  const [editablePersons, setEditablePersons] = useState<ParsedPerson[]>([]);
  const [editableRelations, setEditableRelations] = useState<ParsedRelation[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);

  // 用于取消正在进行的解析请求
  const abortRef = useRef<AbortController | null>(null);

  const provider = getDefaultProvider();
  const isLocal = provider?.type === 'local';

  const handleCancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setDownloadProgress(null);
    setStep('input');
  };

  const handleParse = async () => {
    if (!text.trim()) {
      setError('请输入人物关系描述文本');
      return;
    }
    if (!provider) {
      setError('请先配置 AI 提供商');
      return;
    }

    setError('');
    setDownloadProgress(null);
    setStep('parsing');

    // 每次解析新建 AbortController，支持取消
    const ac = new AbortController();
    abortRef.current = ac;

    // Local model: surface download progress in the UI.
    if (isLocal) {
      onLocalModelProgress((p) => setDownloadProgress(p));
    }

    try {
      const result = await parseWithAI(text.trim(), provider, ac.signal);
      // 解析完成才清理 abortRef（取消时会在 catch 里处理）
      abortRef.current = null;
      setResult(result);
      setEditablePersons(result.persons.map((p) => ({ ...p, tags: p.tags || [] })));
      setEditableRelations(result.relations.map((r) => ({ ...r })));
      setStep('preview');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // 用户主动取消，不显示错误
      } else {
        setError(err instanceof Error ? err.message : 'AI 解析失败，请重试');
        setStep('input');
      }
    } finally {
      setDownloadProgress(null);
      if (abortRef.current === ac) abortRef.current = null;
    }
  };

  const handleConfirm = async () => {
    setStep('confirming');
    setError('');

    try {
      // Map names to IDs
      const nameToId = new Map<string, string>();

      // Create persons
      for (const p of editablePersons) {
        // Skip if person with same name already exists
        const existing = persons.find((ep) => ep.name === p.name);
        if (existing) {
          nameToId.set(p.name, existing.id);
          continue;
        }

        const person = await addPerson({
          name: p.name,
          city: p.city,
          title: p.title,
          company: p.company,
          tags: p.tags || [],
          notes: p.notes,
          viewIds: [currentViewId],
          circleIds: [],
          position: {
            x: 150 + Math.random() * 300,
            y: 100 + Math.random() * 200,
          },
        });
        nameToId.set(p.name, person.id);
      }

      // Create relations
      for (const r of editableRelations) {
        const sourceId = nameToId.get(r.fromName);
        const targetId = nameToId.get(r.toName);
        if (!sourceId || !targetId || sourceId === targetId) continue;

        // Check if relation already exists
        const relations = useRelationStore.getState().relations;
        const exists = relations.some(
          (rel) =>
            (rel.sourceId === sourceId && rel.targetId === targetId) ||
            (rel.sourceId === targetId && rel.targetId === sourceId)
        );
        if (exists) continue;

        await addRelation(sourceId, targetId, r.type);
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '批量创建失败');
      setStep('preview');
    }
  };

  if (!provider && step === 'input') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 text-center" onClick={(e) => e.stopPropagation()}>
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-gray-400">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">需要配置 AI 提供商</h3>
          <p className="text-sm text-gray-500 mb-4">请先在设置中配置 AI（推荐「本地模型」，完全免费，无需 API Key）</p>
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all duration-200"
          >
            知道了
          </button>
        </div>
      </div>
    );
  }

  // --- 解析中：显示进度 + 取消按钮 ---
  if (step === 'parsing') {
    const isDownloading = isLocal && downloadProgress !== null && downloadProgress < 1;
    const statusText = isDownloading
      ? `首次使用，正在下载本地模型…（约 500MB，后续无需重复下载）`
      : isLocal
        ? '本地模型正在推理中…'
        : '正在调用 AI 解析…';

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
        <div
          className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-8 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-blue-600">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>

          <p className="text-sm text-gray-700 mb-3">{statusText}</p>

          {/* 进度条（仅在下载中显示） */}
          {isDownloading && (
            <>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${Math.round(downloadProgress! * 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400">{Math.round(downloadProgress! * 100)}%</p>
            </>
          )}

          {/* 取消按钮 */}
          <button
            onClick={handleCancel}
            className="mt-5 px-5 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-700 transition-all duration-200"
          >
            取消解析
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">AI 批量导入</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              用自然语言描述人物关系，AI 自动解析
            </p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M5.28 4.22a.75.75 0 00-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 101.06 1.06L8 9.06l2.72 2.72a.75.75 0 101.06-1.06L9.06 8l2.72-2.72a.75.75 0 00-1.06-1.06L8 6.94 5.28 4.22z" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {step === 'input' && (
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">
                  描述你的人物关系
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={'例如：\n张三是我在字节跳动的同事，他是产品经理，base在北京；\n李四是张三的大学同学，现在在腾讯做开发；\n王五是我之前的客户，做电商的，和李四也认识...'}
                  className="w-full px-3 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none transition-all"
                  rows={8}
                  autoFocus
                />
              </div>

              {error && (
                <div className="px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}

              <button
                onClick={handleParse}
                disabled={!text.trim()}
                className="w-full py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <span className="flex items-center justify-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  AI 解析
                </span>
              </button>
            </div>
          )}

          {/* Preview step */}
          {(step === 'preview' || step === 'confirming') && result && (
            <div className="p-5 space-y-4">
              {/* Persons preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-700">
                    识别到 {editablePersons.length} 个人物
                  </h3>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {editablePersons.map((p, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
                      <span className="text-xs text-gray-400 w-5">{i + 1}</span>
                      <span className="text-sm text-gray-800 font-medium">{p.name}</span>
                      {p.title && <span className="text-xs text-gray-400">{p.title}</span>}
                      {p.company && <span className="text-xs text-gray-400">@{p.company}</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Relations preview */}
              {editableRelations.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    识别到 {editableRelations.length} 条关系
                  </h3>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {editableRelations.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg text-xs">
                        <span className="text-gray-700">{r.fromName}</span>
                        <span className="text-blue-500">→</span>
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">{r.type}</span>
                        <span className="text-blue-500">→</span>
                        <span className="text-gray-700">{r.toName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {(step === 'preview' || step === 'confirming') && (
          <div className="px-5 py-4 border-t border-gray-100 flex gap-3 shrink-0">
            <button
              onClick={() => { setStep('input'); setResult(null); }}
              className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200"
            >
              重新输入
            </button>
            <button
              onClick={handleConfirm}
              disabled={step === 'confirming'}
              className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {step === 'confirming' ? '导入中...' : `导入 ${editablePersons.length} 个人物`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
