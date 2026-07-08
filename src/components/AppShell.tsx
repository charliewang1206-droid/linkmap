import { useState, useEffect } from 'react';
import { useUIStore } from '../stores/useUIStore';
import { useAIStore } from '../stores/useAIStore';
import TopNav from './TopNav';
import Sidebar from './Sidebar';
import GraphCanvas from './GraphCanvas';
import EditPanel from './EditPanel';
import ProviderSetupModal from './ProviderSetupModal';

export default function AppShell() {
  const selectedPersonId = useUIStore((s) => s.selectedPersonId);
  const isMobileSidebarOpen = useUIStore((s) => s.isMobileSidebarOpen);
  const hasAnyProvider = useAIStore((s) => s.hasAnyProvider);
  const loadProviders = useAIStore((s) => s.loadProviders);
  const [showSetupModal, setShowSetupModal] = useState(false);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  useEffect(() => {
    // Show provider setup modal on first launch if no AI provider configured
    // Use a flag to only show once
    const hasSeenSetup = localStorage.getItem('linkmap-ai-setup-shown');
    if (!hasAnyProvider() && !hasSeenSetup) {
      setShowSetupModal(true);
      localStorage.setItem('linkmap-ai-setup-shown', 'true');
    }
  }, [hasAnyProvider]);

  const handleSetupComplete = () => {
    setShowSetupModal(false);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#f8f9fa]">
      {/* 顶部导航栏 */}
      <TopNav />

      {/* 主体区域 */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* 桌面端侧边栏 */}
        <div className="hidden md:block shrink-0">
          <Sidebar />
        </div>

        {/* 移动端侧边栏 - 底部抽屉 */}
        {isMobileSidebarOpen && (
          <>
            {/* 遮罩 */}
            <div
              className="md:hidden fixed inset-0 bg-black/30 z-40"
              onClick={() => useUIStore.getState().setMobileSidebarOpen(false)}
            />
            {/* 抽屉 */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 max-h-[80vh] rounded-t-2xl overflow-hidden shadow-lg">
              <Sidebar />
            </div>
          </>
        )}

        {/* 中间画布 */}
        <div className="flex-1 min-w-0">
          <GraphCanvas />
        </div>

        {/* 右侧编辑面板 */}
        {selectedPersonId && <EditPanel />}
      </div>

      {/* AI 提供商首次配置引导 */}
      {showSetupModal && <ProviderSetupModal onComplete={handleSetupComplete} />}
    </div>
  );
}
