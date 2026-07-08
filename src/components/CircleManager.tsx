import { useState } from 'react';
import { useCircleStore } from '../stores/useCircleStore';
import { usePersonStore } from '../stores/usePersonStore';
import { useViewStore } from '../stores/useViewStore';
import { CIRCLE_COLORS } from '../types';
import { generateAvatarDataUrl } from '../utils/avatar';

interface CircleManagerProps {
  personId?: string; // If provided, pre-filter for this person
  onClose?: () => void;
}

export default function CircleManager({ personId }: CircleManagerProps) {
  const circles = useCircleStore((s) => s.circles);
  const createCircle = useCircleStore((s) => s.createCircle);
  const deleteCircle = useCircleStore((s) => s.deleteCircle);
  const addPersonToCircle = useCircleStore((s) => s.addPersonToCircle);
  const removePersonFromCircle = useCircleStore((s) => s.removePersonFromCircle);
  const persons = usePersonStore((s) => s.persons);
  const currentViewId = useViewStore((s) => s.currentViewId);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(CIRCLE_COLORS[0]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>(personId ? [personId] : []);
  const [error, setError] = useState('');

  const viewPersons = persons.filter((p) => p.viewIds.includes(currentViewId));

  const handleCreate = async () => {
    setError('');
    if (!newName.trim()) {
      setError('请输入圈子名称');
      return;
    }
    await createCircle({
      name: newName.trim(),
      color: newColor,
      personIds: selectedMembers,
    });
    setShowCreate(false);
    setNewName('');
    setSelectedMembers(personId ? [personId] : []);
  };

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleAddToCircle = async (circleId: string, memberId: string) => {
    await addPersonToCircle(circleId, memberId);
  };

  const handleRemoveFromCircle = async (circleId: string, memberId: string) => {
    await removePersonFromCircle(circleId, memberId);
  };

  const getPersonName = (id: string) => persons.find((p) => p.id === id)?.name || '未知';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs text-gray-400">所属圈子</label>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z" />
          </svg>
          {showCreate ? '收起' : '新建圈子'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="p-3 border border-gray-200 rounded-xl space-y-3 bg-gray-50">
          <div>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="圈子名称"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
              autoFocus
            />
          </div>

          {/* Color picker */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">选择颜色</label>
            <div className="flex flex-wrap gap-1.5">
              {CIRCLE_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewColor(color)}
                  className={`w-6 h-6 rounded-full transition-all duration-150 ${
                    newColor === color ? 'ring-2 ring-offset-1 ring-blue-500 scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Member selection */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">选择成员</label>
            <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100 bg-white">
              {viewPersons.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(p.id)}
                    onChange={() => toggleMember(p.id)}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600"
                  />
                  <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-200 shrink-0">
                    {p.avatar ? (
                      <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <img src={generateAvatarDataUrl(p.name)} alt={p.name} className="w-full h-full" />
                    )}
                  </div>
                  <span className="text-sm text-gray-700 truncate">{p.name}</span>
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={() => setShowCreate(false)}
              className="flex-1 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100"
            >
              取消
            </button>
            <button
              onClick={handleCreate}
              className="flex-1 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              创建
            </button>
          </div>
        </div>
      )}

      {/* Existing circles */}
      {circles.length === 0 ? (
        <p className="text-xs text-gray-400 py-1">暂无圈子</p>
      ) : (
        <div className="space-y-2">
          {circles.map((circle) => (
            <div key={circle.id} className="border border-gray-200 rounded-xl overflow-hidden">
              {/* Circle header */}
              <div className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: `${circle.color}0D` }}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: circle.color }} />
                  <span className="text-sm font-medium text-gray-800">{circle.name}</span>
                  <span className="text-xs text-gray-400">({circle.personIds.length})</span>
                </div>
                {!personId && (
                  <button
                    onClick={() => deleteCircle(circle.id)}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                  >
                    删除
                  </button>
                )}
              </div>

              {/* Members */}
              <div className="px-3 py-2 divide-y divide-gray-50">
                {circle.personIds.length === 0 ? (
                  <p className="text-xs text-gray-400 py-1">暂无成员</p>
                ) : (
                  circle.personIds.map((memberId) => (
                    <div key={memberId} className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-gray-700">{getPersonName(memberId)}</span>
                      <button
                        onClick={() => handleRemoveFromCircle(circle.id, memberId)}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                      >
                        移除
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add member (if personId not specified) */}
              {!personId && (
                <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddToCircle(circle.id, e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                  >
                    <option value="">+ 添加成员</option>
                    {viewPersons
                      .filter((p) => !circle.personIds.includes(p.id))
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
