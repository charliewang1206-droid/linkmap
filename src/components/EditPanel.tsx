import { useState, useEffect, useRef } from 'react';
import { usePersonStore } from '../stores/usePersonStore';
import { useRelationStore } from '../stores/useRelationStore';
import { useViewStore } from '../stores/useViewStore';
import { useUIStore } from '../stores/useUIStore';
import { generateAvatarDataUrl, compressImage } from '../utils/avatar';
import { type Person, type RelationType } from '../types';
import AddRelationModal from './AddRelationModal';
import CircleManager from './CircleManager';

export default function EditPanel() {
  const selectedPersonId = useUIStore((s) => s.selectedPersonId);
  const setSelectedPerson = useUIStore((s) => s.setSelectedPerson);
  const persons = usePersonStore((s) => s.persons);
  const updatePerson = usePersonStore((s) => s.updatePerson);
  const deletePerson = usePersonStore((s) => s.deletePerson);
  const getPerson = usePersonStore((s) => s.getPerson);
  const getRelationsForPerson = useRelationStore((s) => s.getRelationsForPerson);
  const updateRelation = useRelationStore((s) => s.updateRelation);
  const deleteRelation = useRelationStore((s) => s.deleteRelation);
  const views = useViewStore((s) => s.views);
  const addPersonToView = useViewStore((s) => s.addPersonToView);
  const removePersonFromView = useViewStore((s) => s.removePersonFromView);

  const person = selectedPersonId ? getPerson(selectedPersonId) : undefined;
  const personRelations = selectedPersonId ? getRelationsForPerson(selectedPersonId) : [];

  const [form, setForm] = useState<Partial<Person>>({});
  const [tagInput, setTagInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingRelationId, setEditingRelationId] = useState<string | null>(null);
  const [editingRelationType, setEditingRelationType] = useState('');
  const [showAddRelation, setShowAddRelation] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 初始化表单
  useEffect(() => {
    if (person) {
      setForm({
        name: person.name,
        avatar: person.avatar,
        city: person.city,
        title: person.title,
        company: person.company,
        tags: [...person.tags],
        notes: person.notes,
        contact: person.contact ? { ...person.contact } : {},
        viewIds: [...person.viewIds],
      });
    }
  }, [person]);

  // 自动保存（debounce 500ms）
  useEffect(() => {
    if (!selectedPersonId || !person) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      updatePerson(selectedPersonId, form);
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [form, selectedPersonId, updatePerson, person]);

  if (!selectedPersonId || !person) return null;

  const updateField = <K extends keyof Person>(key: K, value: Person[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      updateField('avatar', dataUrl);
    } catch {
      // ignore
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (!tag) return;
    const currentTags = form.tags || [];
    if (currentTags.includes(tag)) {
      setTagInput('');
      return;
    }
    updateField('tags', [...currentTags, tag]);
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    updateField(
      'tags',
      (form.tags || []).filter((t) => t !== tag)
    );
  };

  const handleSave = () => {
    if (!selectedPersonId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    updatePerson(selectedPersonId, form);
  };

  const handleDelete = async () => {
    if (!selectedPersonId) return;
    await deletePerson(selectedPersonId);
    setSelectedPerson(null);
  };

  const handleViewToggle = (viewId: string) => {
    const currentViewIds = form.viewIds || [];
    if (currentViewIds.includes(viewId)) {
      updateField(
        'viewIds',
        currentViewIds.filter((id) => id !== viewId)
      );
      removePersonFromView(viewId, selectedPersonId);
    } else {
      updateField('viewIds', [...currentViewIds, viewId]);
      addPersonToView(viewId, selectedPersonId);
      // Update view's lastActiveAt for sorting
      useViewStore.getState().touchView(viewId);
    }
  };

  const handleUpdateRelation = (relationId: string) => {
    if (!editingRelationType.trim()) return;
    updateRelation(relationId, { type: editingRelationType.trim() as RelationType });
    setEditingRelationId(null);
  };

  const getPersonName = (personId: string) => {
    return persons.find((p) => p.id === personId)?.name || '未知';
  };

  return (
    <>
    <div className="hidden md:flex w-[320px] h-full bg-white border-l border-gray-200 flex-col shrink-0 overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">编辑人物</h2>
        <button
          onClick={() => setSelectedPerson(null)}
          className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M5.28 4.22a.75.75 0 00-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 101.06 1.06L8 9.06l2.72 2.72a.75.75 0 101.06-1.06L9.06 8l2.72-2.72a.75.75 0 00-1.06-1.06L8 6.94 5.28 4.22z" />
          </svg>
        </button>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* 头像 */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 hover:opacity-80 transition-opacity relative group"
          >
            {form.avatar ? (
              <img
                src={form.avatar}
                alt={form.name || ''}
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={generateAvatarDataUrl(person.name)}
                alt={person.name}
                className="w-full h-full"
              />
            )}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full">
              <span className="text-white text-xs">更换</span>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
          />
        </div>

        {/* 名字 */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">名字 *</label>
          <input
            type="text"
            value={form.name || ''}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="请输入名字"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition-all"
          />
        </div>

        {/* 城市 */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">城市</label>
          <input
            type="text"
            value={form.city || ''}
            onChange={(e) => updateField('city', e.target.value)}
            placeholder="如：北京"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition-all"
          />
        </div>

        {/* 职位 */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">职位</label>
          <input
            type="text"
            value={form.title || ''}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="如：产品经理"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition-all"
          />
        </div>

        {/* 公司 */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">公司</label>
          <input
            type="text"
            value={form.company || ''}
            onChange={(e) => updateField('company', e.target.value)}
            placeholder="如：字节跳动"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition-all"
          />
        </div>

        {/* 标签 */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">标签</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(form.tags || []).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-md"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="text-blue-400 hover:text-blue-700 transition-colors"
                >
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M5.28 4.22a.75.75 0 00-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 101.06 1.06L8 9.06l2.72 2.72a.75.75 0 101.06-1.06L9.06 8l2.72-2.72a.75.75 0 00-1.06-1.06L8 6.94 5.28 4.22z" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-1">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder="输入标签后回车"
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition-all"
            />
          </div>
        </div>

        {/* 备注 */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">备注</label>
          <textarea
            value={form.notes || ''}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="关于这个人的备注..."
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 resize-none transition-all"
          />
        </div>

        {/* 联系方式 */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">联系方式</label>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-400">电话</label>
              <input
                type="text"
                value={form.contact?.phone || ''}
                onChange={(e) =>
                  updateField('contact', {
                    ...form.contact,
                    phone: e.target.value,
                  })
                }
                placeholder="手机号"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition-all"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">邮箱</label>
              <input
                type="email"
                value={form.contact?.email || ''}
                onChange={(e) =>
                  updateField('contact', {
                    ...form.contact,
                    email: e.target.value,
                  })
                }
                placeholder="email@example.com"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition-all"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">微信</label>
              <input
                type="text"
                value={form.contact?.wechat || ''}
                onChange={(e) =>
                  updateField('contact', {
                    ...form.contact,
                    wechat: e.target.value,
                  })
                }
                placeholder="微信号"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition-all"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">LinkedIn</label>
              <input
                type="text"
                value={form.contact?.linkedin || ''}
                onChange={(e) =>
                  updateField('contact', {
                    ...form.contact,
                    linkedin: e.target.value,
                  })
                }
                placeholder="LinkedIn URL"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition-all"
              />
            </div>
          </div>
        </div>

        {/* 所属 View */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">所属视图</label>
          <div className="space-y-1">
            {views.map((view) => (
              <label
                key={view.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={(form.viewIds || []).includes(view.id)}
                  onChange={() => handleViewToggle(view.id)}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-400"
                />
                <span className="text-sm text-gray-700">
                  {view.icon && <span className="mr-1">{view.icon}</span>}
                  {view.name}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* 所属圈子 */}
        <CircleManager personId={selectedPersonId} />

        {/* 关系列表 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-400">关系列表</label>
            <button
              onClick={() => setShowAddRelation(true)}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z" />
              </svg>
              添加关系
            </button>
          </div>
          {personRelations.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">暂无关系，在画布中拖拽连线创建</p>
          ) : (
            <div className="space-y-1">
              {personRelations.map((rel) => {
                const isOther = rel.sourceId === selectedPersonId;
                const otherId = isOther ? rel.targetId : rel.sourceId;
                const otherName = getPersonName(otherId);

                return (
                  <div
                    key={rel.id}
                    className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {editingRelationId === rel.id ? (
                      <div className="flex items-center gap-1 flex-1">
                        <input
                          type="text"
                          value={editingRelationType}
                          onChange={(e) => setEditingRelationType(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdateRelation(rel.id);
                            if (e.key === 'Escape') setEditingRelationId(null);
                          }}
                          className="flex-1 px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                          autoFocus
                        />
                        <button
                          onClick={() => handleUpdateRelation(rel.id)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          确定
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm text-gray-800 truncate">
                            {otherName}
                          </span>
                          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                            {rel.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              setEditingRelationId(rel.id);
                              setEditingRelationType(rel.type);
                            }}
                            className="text-xs text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => deleteRelation(rel.id)}
                            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                          >
                            删除
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="px-4 py-3 border-t border-gray-100 space-y-2">
        <button
          onClick={handleSave}
          className="w-full py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all duration-200"
        >
          保存
        </button>

        {showDeleteConfirm ? (
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              className="flex-1 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-all duration-200"
            >
              确认删除
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200"
            >
              取消
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-all duration-200"
          >
            删除人物
          </button>
        )}
      </div>
    </div>
    {/* 添加关系弹窗 */}
    {showAddRelation && (
      <AddRelationModal
        sourcePersonId={selectedPersonId}
        onClose={() => setShowAddRelation(false)}
      />
    )}
    </>
  );
}
