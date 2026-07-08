import { useMemo, useState } from 'react';
import { usePersonStore } from '../stores/usePersonStore';
import { useUIStore } from '../stores/useUIStore';
import { useViewStore } from '../stores/useViewStore';
import { generateAvatarDataUrl } from '../utils/avatar';

export default function Sidebar() {
  const persons = usePersonStore((s) => s.persons);
  const selectedPersonId = useUIStore((s) => s.selectedPersonId);
  const setSelectedPerson = useUIStore((s) => s.setSelectedPerson);
  const searchQuery = useUIStore((s) => s.searchQuery);
  const currentViewId = useViewStore((s) => s.currentViewId);
  const activeFilters = useUIStore((s) => s.activeFilters);
  const setFilters = useUIStore((s) => s.setFilters);
  const clearFilters = useUIStore((s) => s.clearFilters);

  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showTitleDropdown, setShowTitleDropdown] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);

  // 从当前 View 的人物中提取动态筛选值
  const filteredPersons = useMemo(() => {
    let result = persons.filter((p) => p.viewIds.includes(currentViewId));

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.company && p.company.toLowerCase().includes(q)) ||
          (p.city && p.city.toLowerCase().includes(q)) ||
          (p.title && p.title.toLowerCase().includes(q))
      );
    }

    if (activeFilters.city) {
      result = result.filter((p) => p.city === activeFilters.city);
    }
    if (activeFilters.title) {
      result = result.filter((p) => p.title?.includes(activeFilters.title || ''));
    }
    if (activeFilters.tags && activeFilters.tags.length > 0) {
      result = result.filter((p) =>
        activeFilters.tags!.some((t) => p.tags.includes(t))
      );
    }

    return result;
  }, [persons, currentViewId, searchQuery, activeFilters]);

  // 提取筛选选项
  const cities = useMemo(
    () => [...new Set(persons.map((p) => p.city).filter(Boolean))],
    [persons]
  );
  const titles = useMemo(
    () => [...new Set(persons.map((p) => p.title).filter(Boolean))],
    [persons]
  );
  const allTags = useMemo(
    () => [...new Set(persons.flatMap((p) => p.tags))],
    [persons]
  );

  return (
    <aside className="w-[280px] h-full bg-white border-r border-gray-200 flex flex-col shrink-0">
      {/* 筛选区域 */}
      <div className="p-3 space-y-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          {/* 城市筛选 */}
          <div className="relative flex-1">
            <button
              onClick={() => setShowCityDropdown(!showCityDropdown)}
              className={`w-full px-2.5 py-1.5 text-xs border rounded-lg text-left transition-all duration-200 ${
                activeFilters.city
                  ? 'border-blue-400 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {activeFilters.city || '城市'}
            </button>
            {showCityDropdown && (
              <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto">
                <button
                  onClick={() => {
                    setFilters({ ...activeFilters, city: undefined });
                    setShowCityDropdown(false);
                  }}
                  className="w-full px-3 py-1.5 text-xs text-left text-gray-400 hover:bg-gray-50"
                >
                  全部
                </button>
                {cities.map((city) => (
                  <button
                    key={city}
                    onClick={() => {
                      setFilters({ ...activeFilters, city });
                      setShowCityDropdown(false);
                    }}
                    className="w-full px-3 py-1.5 text-xs text-left text-gray-700 hover:bg-blue-50"
                  >
                    {city}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 职位筛选 */}
          <div className="relative flex-1">
            <button
              onClick={() => setShowTitleDropdown(!showTitleDropdown)}
              className={`w-full px-2.5 py-1.5 text-xs border rounded-lg text-left transition-all duration-200 ${
                activeFilters.title
                  ? 'border-blue-400 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {activeFilters.title || '职位'}
            </button>
            {showTitleDropdown && (
              <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto">
                <button
                  onClick={() => {
                    setFilters({ ...activeFilters, title: undefined });
                    setShowTitleDropdown(false);
                  }}
                  className="w-full px-3 py-1.5 text-xs text-left text-gray-400 hover:bg-gray-50"
                >
                  全部
                </button>
                {titles.map((title) => (
                  <button
                    key={title}
                    onClick={() => {
                      setFilters({ ...activeFilters, title });
                      setShowTitleDropdown(false);
                    }}
                    className="w-full px-3 py-1.5 text-xs text-left text-gray-700 hover:bg-blue-50"
                  >
                    {title}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 标签筛选 */}
          <div className="relative flex-1">
            <button
              onClick={() => setShowTagDropdown(!showTagDropdown)}
              className={`w-full px-2.5 py-1.5 text-xs border rounded-lg text-left transition-all duration-200 ${
                activeFilters.tags && activeFilters.tags.length > 0
                  ? 'border-blue-400 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              标签
            </button>
            {showTagDropdown && (
              <div className="absolute top-full right-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto">
                <button
                  onClick={() => {
                    setFilters({ ...activeFilters, tags: undefined });
                    setShowTagDropdown(false);
                  }}
                  className="w-full px-3 py-1.5 text-xs text-left text-gray-400 hover:bg-gray-50"
                >
                  全部
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      const current = activeFilters.tags || [];
                      const next = current.includes(tag)
                        ? current.filter((t) => t !== tag)
                        : [...current, tag];
                      setFilters({
                        ...activeFilters,
                        tags: next.length > 0 ? next : undefined,
                      });
                    }}
                    className={`w-full px-3 py-1.5 text-xs text-left hover:bg-blue-50 flex items-center justify-between ${
                      (activeFilters.tags || []).includes(tag)
                        ? 'text-blue-700 bg-blue-50'
                        : 'text-gray-700'
                    }`}
                  >
                    {tag}
                    {(activeFilters.tags || []).includes(tag) && (
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 清除筛选 */}
        {Object.keys(activeFilters).length > 0 && (
          <button
            onClick={clearFilters}
            className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            清除所有筛选
          </button>
        )}
      </div>

      {/* 人物列表 */}
      <div className="flex-1 overflow-y-auto">
        {filteredPersons.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 px-4 text-center">
            <svg
              className="w-12 h-12 mb-3 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <p className="text-sm">暂无人物，点击下方按钮添加</p>
          </div>
        ) : (
          <div className="py-1">
            {filteredPersons.map((person) => (
              <button
                key={person.id}
                onClick={() => setSelectedPerson(person.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-200 ${
                  selectedPersonId === person.id
                    ? 'bg-blue-50 border-l-2 border-blue-600'
                    : 'hover:bg-gray-50 border-l-2 border-transparent'
                }`}
              >
                {/* 头像 */}
                <div className="w-9 h-9 rounded-full shrink-0 overflow-hidden bg-gray-200 flex items-center justify-center">
                  {person.avatar ? (
                    <img
                      src={person.avatar}
                      alt={person.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={generateAvatarDataUrl(person.name)}
                      alt={person.name}
                      className="w-full h-full"
                    />
                  )}
                </div>

                {/* 信息 */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {person.name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {[person.city, person.title].filter(Boolean).join(' · ') || '未设置'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
