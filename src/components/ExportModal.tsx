import { useState, useCallback } from 'react';
import { useUIStore } from '../stores/useUIStore';
import { usePersonStore } from '../stores/usePersonStore';
import { useRelationStore } from '../stores/useRelationStore';
import { useViewStore } from '../stores/useViewStore';
import { EXPORTABLE_FIELDS, PERSON_FIELD_LABELS, type PrivacyMode, type Person } from '../types';
import { toPng } from 'html-to-image';

interface ExportModalProps {
  onClose: () => void;
  canvasRef: React.RefObject<HTMLDivElement | null>;
}

const TEMPLATE_OPTIONS = [
  { value: 'minimal_white', label: '极简白底', description: '白色背景，简洁线条' },
  { value: 'business_grey', label: '商务蓝灰', description: '蓝灰色调，专业感' },
  { value: 'dark_tech', label: '暗色科技风', description: '深色背景，科技感' },
  { value: 'warm_journal', label: '温暖手账风', description: '暖色调，亲切感' },
] as const;

const PRIVACY_OPTIONS: { value: PrivacyMode; label: string; description: string }[] = [
  { value: 'full', label: '完整模式', description: '显示所有信息' },
  { value: 'simple', label: '简洁模式', description: '仅显示姓名和关系' },
  { value: 'private', label: '隐私模式', description: '隐藏联系方式等敏感信息' },
  { value: 'custom', label: '自定义', description: '手动选择要显示的字段' },
];

export default function ExportModal({ onClose, canvasRef }: ExportModalProps) {
  const persons = usePersonStore((s) => s.persons);
  const relations = useRelationStore((s) => s.relations);
  const views = useViewStore((s) => s.views);
  const focusedPersonId = useUIStore((s) => s.focusedPersonId);
  const currentViewId = useViewStore((s) => s.currentViewId);

  const [scope, setScope] = useState<'current_view' | 'person_focus'>('current_view');
  const [privacyMode, setPrivacyMode] = useState<PrivacyMode>('full');
  const [template, setTemplate] = useState<string>('minimal_white');
  const [customFields, setCustomFields] = useState<(keyof Person)[]>(
    EXPORTABLE_FIELDS.filter((f) => f !== 'contact')
  );
  const [isExporting, setIsExporting] = useState(false);

  const currentView = views.find((v) => v.id === currentViewId);

  const handleExport = useCallback(async () => {
    const element = canvasRef.current;
    if (!element) return;

    setIsExporting(true);
    try {
      const dataUrl = await toPng(element, {
        backgroundColor: template === 'dark_tech' ? '#1a1a2e' : '#ffffff',
        pixelRatio: 2,
      });

      const link = document.createElement('a');
      link.download = `linkmap-export-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('导出失败:', err);
    } finally {
      setIsExporting(false);
    }
  }, [canvasRef, template]);

  const toggleCustomField = (field: keyof Person) => {
    setCustomFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* 内容 */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-[90vw] max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">导出预览</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M5.28 4.22a.75.75 0 00-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 101.06 1.06L8 9.06l2.72 2.72a.75.75 0 101.06-1.06L9.06 8l2.72-2.72a.75.75 0 00-1.06-1.06L8 6.94 5.28 4.22z" />
            </svg>
          </button>
        </div>

        {/* 主体 */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 左侧：预览 */}
          <div
            className={`rounded-xl border overflow-hidden ${
              template === 'dark_tech' ? 'bg-[#1a1a2e] border-gray-700' : 'bg-white border-gray-200'
            }`}
          >
            <div className="p-4 min-h-[300px] flex flex-col items-center justify-center">
              <div
                className={`text-center ${
                  template === 'dark_tech' ? 'text-gray-300' : 'text-gray-500'
                }`}
              >
                <svg
                  className="w-16 h-16 mx-auto mb-3 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-sm">
                  {scope === 'current_view' && currentView
                    ? `当前视图: ${currentView.name}`
                    : '聚焦人物视图'}
                </p>
                <p className="text-xs mt-1 opacity-70">
                  {persons.length} 人 · {relations.length} 条关系
                </p>
              </div>
            </div>
          </div>

          {/* 右侧：设置 */}
          <div className="space-y-5">
            {/* 导出范围 */}
            <div>
              <label className="block text-xs text-gray-500 font-medium mb-2">导出范围</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setScope('current_view')}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-all duration-200 ${
                    scope === 'current_view'
                      ? 'border-blue-400 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  当前 View
                </button>
                <button
                  onClick={() => setScope('person_focus')}
                  disabled={!focusedPersonId}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-all duration-200 ${
                    scope === 'person_focus'
                      ? 'border-blue-400 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-400 hover:border-gray-300'
                  }`}
                  title={!focusedPersonId ? '请先在画布中双击聚焦人物' : ''}
                >
                  聚焦人物
                </button>
              </div>
            </div>

            {/* 隐私模式 */}
            <div>
              <label className="block text-xs text-gray-500 font-medium mb-2">隐私模式</label>
              <div className="space-y-2">
                {PRIVACY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPrivacyMode(opt.value)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all duration-200 ${
                      privacyMode === opt.value
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div
                      className={`text-sm font-medium ${
                        privacyMode === opt.value ? 'text-blue-700' : 'text-gray-800'
                      }`}
                    >
                      {opt.label}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{opt.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 自定义字段 */}
            {privacyMode === 'custom' && (
              <div>
                <label className="block text-xs text-gray-500 font-medium mb-2">
                  选择可见字段
                </label>
                <div className="flex flex-wrap gap-2">
                  {EXPORTABLE_FIELDS.map((field) => (
                    <label
                      key={field}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 border border-gray-200 rounded-lg cursor-pointer hover:border-gray-300 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={customFields.includes(field)}
                        onChange={() => toggleCustomField(field)}
                        className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-blue-400"
                      />
                      <span className="text-xs text-gray-700">
                        {PERSON_FIELD_LABELS[field]}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* 模板选择 */}
            <div>
              <label className="block text-xs text-gray-500 font-medium mb-2">
                模板选择
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATE_OPTIONS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTemplate(t.value)}
                    className={`text-left px-3 py-2.5 rounded-lg border transition-all duration-200 ${
                      template === t.value
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div
                      className={`text-sm font-medium ${
                        template === t.value ? 'text-blue-700' : 'text-gray-800'
                      }`}
                    >
                      {t.label}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{t.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200"
          >
            取消
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? '导出中...' : '导出 PNG'}
          </button>
        </div>
      </div>
    </div>
  );
}
