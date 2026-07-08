interface EmptyStateProps {
  onAddPerson: () => void;
}

export default function EmptyState({ onAddPerson }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center max-w-sm">
      {/* 关系图简笔画图标 */}
      <div className="w-20 h-20 mb-6 text-gray-300">
        <svg viewBox="0 0 80 80" fill="none" stroke="currentColor" className="w-full h-full">
          {/* 人物节点 */}
          <circle cx="25" cy="25" r="10" strokeWidth="1.5" />
          <circle cx="55" cy="25" r="10" strokeWidth="1.5" />
          <circle cx="40" cy="55" r="10" strokeWidth="1.5" />
          <circle cx="15" cy="55" r="8" strokeWidth="1.5" />
          <circle cx="65" cy="55" r="8" strokeWidth="1.5" />

          {/* 连线 */}
          <line x1="34" y1="28" x2="46" y2="28" strokeWidth="1" />
          <line x1="30" y1="34" x2="34" y2="46" strokeWidth="1" />
          <line x1="50" y1="34" x2="46" y2="46" strokeWidth="1" />
          <line x1="21" y1="49" x2="34" y2="49" strokeWidth="1" strokeDasharray="3 2" />
          <line x1="46" y1="49" x2="59" y2="49" strokeWidth="1" strokeDasharray="3 2" />
        </svg>
      </div>

      {/* 标题 */}
      <h2 className="text-lg font-semibold text-gray-700 mb-2">
        开始记录你的人脉网络
      </h2>

      {/* 副标题 */}
      <p className="text-sm text-gray-400 mb-6 leading-relaxed">
        添加人物、建立关系，看清你的社交网络
      </p>

      {/* 操作按钮 */}
      <button
        onClick={onAddPerson}
        className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all duration-200 active:scale-95"
      >
        添加第一个人物
      </button>
    </div>
  );
}
