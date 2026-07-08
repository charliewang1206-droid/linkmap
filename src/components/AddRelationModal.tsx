import { useState, useMemo } from 'react';
import { usePersonStore } from '../stores/usePersonStore';
import { useRelationStore } from '../stores/useRelationStore';
import { useViewStore } from '../stores/useViewStore';
import { PRESET_RELATION_TYPES } from '../types';
import { generateAvatarDataUrl } from '../utils/avatar';

interface AddRelationModalProps {
  sourcePersonId: string;
  onClose: () => void;
}

export default function AddRelationModal({ sourcePersonId, onClose }: AddRelationModalProps) {
  const persons = usePersonStore((s) => s.persons);
  const addRelation = useRelationStore((s) => s.addRelation);
  const relations = useRelationStore((s) => s.relations);
  const currentViewId = useViewStore((s) => s.currentViewId);

  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [relationType, setRelationType] = useState<string>(PRESET_RELATION_TYPES[0]);
  const [customType, setCustomType] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const sourcePerson = persons.find((p) => p.id === sourcePersonId);

  // Filter: persons in current view, excluding self and those already related
  const availableTargets = useMemo(() => {
    return persons.filter((p) => {
      if (p.id === sourcePersonId) return false;
      if (!p.viewIds.includes(currentViewId)) return false;
      // Exclude already related
      const alreadyRelated = relations.some(
        (r) =>
          (r.sourceId === sourcePersonId && r.targetId === p.id) ||
          (r.sourceId === p.id && r.targetId === sourcePersonId)
      );
      return !alreadyRelated;
    });
  }, [persons, sourcePersonId, currentViewId, relations]);

  const handleSubmit = async () => {
    setError('');
    if (!selectedTargetId) {
      setError('请选择目标人物');
      return;
    }
    const type = isCustom ? customType.trim() : relationType;
    if (!type) {
      setError('请输入关系类型');
      return;
    }

    setIsSubmitting(true);
    try {
      await addRelation(sourcePersonId, selectedTargetId, type);
      if (notes.trim()) {
        // Update the newly created relation with notes
        const newRel = useRelationStore.getState().relations.find(
          (r) =>
            (r.sourceId === sourcePersonId && r.targetId === selectedTargetId) ||
            (r.sourceId === selectedTargetId && r.targetId === sourcePersonId)
        );
        if (newRel) {
          await useRelationStore.getState().updateRelation(newRel.id, { notes: notes.trim() });
        }
      }
      onClose();
    } catch {
      setError('创建关系失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">添加关系</h2>
          {sourcePerson && (
            <p className="text-xs text-gray-400 mt-0.5">
              为 <span className="text-gray-600 font-medium">{sourcePerson.name}</span> 添加关系
            </p>
          )}
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Target person selection */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">目标人物</label>
            {availableTargets.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">当前视图中没有可添加的人物</p>
            ) : (
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                {availableTargets.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedTargetId(p.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-150 ${
                      selectedTargetId === p.id
                        ? 'bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 bg-gray-200">
                      {p.avatar ? (
                        <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <img src={generateAvatarDataUrl(p.name)} alt={p.name} className="w-full h-full" />
                      )}
                    </div>
                    <span className="text-sm text-gray-700 truncate">{p.name}</span>
                    {p.title && (
                      <span className="text-xs text-gray-400 truncate">{p.title}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Relation type */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">关系类型</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {PRESET_RELATION_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => { setIsCustom(false); setRelationType(type); }}
                  className={`px-2.5 py-1 text-xs rounded-full transition-all duration-150 ${
                    !isCustom && relationType === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {type}
                </button>
              ))}
              <button
                onClick={() => { setIsCustom(true); setCustomType(''); }}
                className={`px-2.5 py-1 text-xs rounded-full transition-all duration-150 ${
                  isCustom
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                自定义
              </button>
            </div>
            {isCustom && (
              <input
                type="text"
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                placeholder="输入自定义关系类型..."
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
                autoFocus
              />
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">备注（可选）</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="关于这段关系的备注..."
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
              rows={2}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedTargetId}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '创建中...' : '创建关系'}
          </button>
        </div>
      </div>
    </div>
  );
}
