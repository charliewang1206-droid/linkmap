import { useState, useRef, useEffect } from 'react';
import { useViewStore } from '../stores/useViewStore';
import { useUIStore } from '../stores/useUIStore';

export default function TopNav() {
  const views = useViewStore((s) => s.views);
  const currentViewId = useViewStore((s) => s.currentViewId);
  const setCurrentView = useViewStore((s) => s.setCurrentView);
  const createView = useViewStore((s) => s.createView);
  const searchQuery = useUIStore((s) => s.searchQuery);
  const setSearchQuery = useUIStore((s) => s.setSearchQuery);

  const [showNewViewInput, setShowNewViewInput] = useState(false);
  const [newViewName, setNewViewName] = useState('');
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
    <header className="h-14 bg-white border-b border-gray-200 flex items-center shrink-0 z-30">
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

      {/* 搜索框 */}
      <div className="shrink-0 px-4 md:px-6">
        <div className="relative">
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
  );
}
