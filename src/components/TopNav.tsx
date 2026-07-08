import { useState, useRef, useEffect } from 'react';
import { useViewStore } from '../stores/useViewStore';
import { useUIStore } from '../stores/useUIStore';
import BatchImportModal from './BatchImportModal';
import ProviderSetupModal from './ProviderSetupModal';

export default function TopNav() {
  const views = useViewStore((s) => s.views);
  const currentViewId = useViewStore((s) => s.currentViewId);
  const setCurrentView = useViewStore((s) => s.setCurrentView);
  const createView = useViewStore((s) => s.createView);
  const searchQuery = useUIStore((s) => s.searchQuery);
  const setSearchQuery = useUIStore((s) => s.setSearchQuery);
  const toggleMobileSidebar = useUIStore((s) => s.toggleMobileSidebar);
  const setAISettingsOpen = useUIStore((s) => s.setAISettingsOpen);
  const aiSettingsOpen = useUIStore((s) => s.aiSettingsOpen);

  const [showNewViewInput, setShowNewViewInput] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [showBatchImport, setShowBatchImport] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showNewViewInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showNewViewInput]);

  const handleCreateView = async () => {
    const name = newViewName.trim();
    if (!name) return;
    await createView(name);
    setNewViewName('');
    setShowNewViewInput(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreateView();
    if (e.key === 'Escape') {
      setShowNewViewInput(false);
      setNewViewName('');
    }
  };

  return (
    <>
    <header className="h-14 bg-white border-b border-gray-200 flex items-center shrink-0 z-30">
      {/* 移动端汉堡菜单 */}
      <button
        onClick={toggleMobileSidebar}
        className="md:hidden shrink-0 ml-3 mr-1 w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
        title="打开侧边栏"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Logo */}
      <div className="shrink-0 px-4 md:px-6">
        <h1 className="text-lg font-bold text-gray-900 tracking-tight select-none">
          LinkMap
        </h1>
      </div>

      {/* View Tabs - 横向滚动 */}
      <nav className="flex-1 flex items-center overflow-x-auto px-2 gap-1">
        {views.map((view) => (
          <button
            key={view.id}
            onClick={() => setCurrentView(view.id)}
            className={`shrink-0 px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${
              currentViewId === view.id
                ? 'text-blue-600 font-medium bg-blue-50 border-b-2 border-blue-600 rounded-b-none'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            {view.icon && <span className="mr-1">{view.icon}</span>}
            {view.name}
          </button>
        ))}

        {/* 添加自定义 View 按钮 */}
        {showNewViewInput ? (
          <input
            ref={inputRef}
            type="text"
            value={newViewName}
            onChange={(e) => setNewViewName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (!newViewName.trim()) {
                setShowNewViewInput(false);
              }
            }}
            placeholder="视图名称"
            className="shrink-0 w-28 px-2 py-1 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        ) : (
          <button
            onClick={() => setShowNewViewInput(true)}
            className="shrink-0 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
            title="创建自定义视图"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z" />
            </svg>
          </button>
        )}
      </nav>

      {/* 搜索框 + 移动端添加按钮 */}
      <div className="shrink-0 flex items-center gap-2 px-3 md:px-6">
        {/* AI 批量导入按钮 */}
        <button
          onClick={() => setShowBatchImport(true)}
          className="shrink-0 hidden md:flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg transition-all duration-200 shadow-sm"
          title="AI 批量导入"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          AI 导入
        </button>

        {/* AI 设置入口（桌面/移动端均可随时调整 AI 配置） */}
        <button
          onClick={() => setAISettingsOpen(true)}
          className="shrink-0 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
          title="AI 设置"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>

        {/* 移动端快捷添加按钮 */}
        <button
          onClick={() => {
            // 触发全局事件让 GraphCanvas/Sidebar 打开 AddPersonModal
            window.dispatchEvent(new CustomEvent('linkmap:openAddModal'));
          }}
          className="md:hidden shrink-0 w-9 h-9 flex items-center justify-center text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all duration-200 shadow-sm active:scale-95"
          title="添加人物"
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z" />
          </svg>
        </button>

        {/* 搜索框 - 桌面端显示 */}
        <div className="relative hidden md:block">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索人物..."
            className="w-40 md:w-56 pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200"
          />
        </div>
      </div>
    </header>
      {/* AI 批量导入弹窗 */}
      {showBatchImport && (
        <BatchImportModal onClose={() => setShowBatchImport(false)} />
      )}

      {/* AI 设置弹窗（随时调整配置） */}
      {aiSettingsOpen && (
        <ProviderSetupModal mode="manage" onComplete={() => setAISettingsOpen(false)} />
      )}
    </>
  );
}
