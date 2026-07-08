import { useState, useCallback, useRef } from 'react';
import { usePersonStore } from '../stores/usePersonStore';
import { useRelationStore } from '../stores/useRelationStore';
import { useViewStore } from '../stores/useViewStore';
import { exportBackup, importBackup } from '../utils/backup';
import type { BackupData } from '../types';

interface BackupModalProps {
  onClose: () => void;
}

export default function BackupModal({ onClose }: BackupModalProps) {
  const persons = usePersonStore((s) => s.persons);
  const relations = useRelationStore((s) => s.relations);
  const views = useViewStore((s) => s.views);
  const loadPersons = usePersonStore((s) => s.loadPersons);
  const loadRelations = useRelationStore((s) => s.loadRelations);
  const loadViews = useViewStore((s) => s.loadViews);

  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [importPreview, setImportPreview] = useState<{
    data: BackupData;
    persons: number;
    relations: number;
    views: number;
  } | null>(null);
  const [importError, setImportError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleExport = useCallback(async () => {
    try {
      await exportBackup();
    } catch (err) {
      console.error('导出失败:', err);
    }
  }, []);

  const handleFileSelect = useCallback(
    async (file: File) => {
      setImportError('');
      setImportPreview(null);

      if (!file.name.endsWith('.json')) {
        setImportError('请选择 JSON 格式的备份文件');
        return;
      }

      try {
        const result = await importBackup(file);
        if (!result) {
          setImportError('无法解析备份文件');
          return;
        }

        setImportPreview({
          data: {
            version: '2.0.0',
            exportedAt: new Date().toISOString(),
            persons: result.persons,
            relations: result.relations,
            views: result.views,
            circles: result.circles || [],
            aiProviders: result.aiProviders || [],
          },
          persons: result.persons.length,
          relations: result.relations.length,
          views: result.views.length,
        });
      } catch (err) {
        setImportError(err instanceof Error ? err.message : '导入失败');
      }
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleConfirmImport = useCallback(async () => {
    if (!importPreview) return;

    setIsImporting(true);
    try {
      // 使用 store 的 import 方法
      await usePersonStore.getState().importPersons(importPreview.data.persons);
      await useRelationStore.getState().importRelations(importPreview.data.relations);

      // Import views
      const { db } = await import('../db');
      await db.views.bulkPut(importPreview.data.views);

      // Reload all
      await Promise.all([loadPersons(), loadRelations(), loadViews()]);

      setImportPreview(null);
      onClose();
    } catch (err) {
      setImportError('导入失败，请重试');
    } finally {
      setIsImporting(false);
    }
  }, [importPreview, loadPersons, loadRelations, loadViews, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* 内容 */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-[90vw] max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">备份与恢复</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M5.28 4.22a.75.75 0 00-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 101.06 1.06L8 9.06l2.72 2.72a.75.75 0 101.06-1.06L9.06 8l2.72-2.72a.75.75 0 00-1.06-1.06L8 6.94 5.28 4.22z" />
            </svg>
          </button>
        </div>

        {/* Tab 切换 */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-3 text-sm font-medium transition-all duration-200 ${
              activeTab === 'export'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            导出备份
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-3 text-sm font-medium transition-all duration-200 ${
              activeTab === 'import'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            导入恢复
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'export' ? (
            <div className="space-y-4">
              {/* 数据摘要 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-700">{persons.length}</p>
                  <p className="text-xs text-blue-500 mt-1">人物</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">{relations.length}</p>
                  <p className="text-xs text-green-500 mt-1">关系</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-purple-700">{views.length}</p>
                  <p className="text-xs text-purple-500 mt-1">视图</p>
                </div>
              </div>

              <p className="text-sm text-gray-400">
                备份将导出所有人物、关系和视图数据为 JSON 文件，可用于数据迁移和恢复。
              </p>

              <button
                onClick={handleExport}
                className="w-full py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all duration-200"
              >
                导出备份
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {!importPreview ? (
                <>
                  {/* 拖拽上传区域 */}
                  <div
                    ref={dropZoneRef}
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-200"
                  >
                    <svg
                      className="w-10 h-10 mx-auto mb-3 text-gray-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="text-sm text-gray-500">
                      拖拽 JSON 备份文件到此处，或点击选择文件
                    </p>
                    <p className="text-xs text-gray-400 mt-1">仅支持 .json 格式</p>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                    className="hidden"
                  />

                  {importError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600">{importError}</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* 导入预览 */}
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-3">
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-5 h-5 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="text-sm font-medium text-green-700">备份文件验证通过</span>
                    </div>

                    <div className="text-sm text-green-600 space-y-1">
                      <p>将导入以下数据：</p>
                      <ul className="list-disc list-inside pl-2">
                        <li>{importPreview.persons} 个人物</li>
                        <li>{importPreview.relations} 条关系</li>
                        <li>{importPreview.views} 个视图</li>
                      </ul>
                    </div>

                    <p className="text-xs text-green-500">
                      导入将合并现有数据，不会删除当前数据。
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setImportPreview(null)}
                      className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleConfirmImport}
                      disabled={isImporting}
                      className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isImporting ? '导入中...' : '确认导入'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
