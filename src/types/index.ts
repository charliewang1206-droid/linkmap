// ============================================================
// LinkMap Type Definitions
// ============================================================

export interface PersonContact {
  phone?: string;
  email?: string;
  wechat?: string;
  linkedin?: string;
}

export interface Person {
  id: string;
  name: string;
  avatar?: string;        // Base64 data URL
  city?: string;
  title?: string;
  company?: string;
  tags: string[];
  notes?: string;
  contact?: PersonContact;
  viewIds: string[];       // Which views this person belongs to
  position?: { x: number; y: number }; // Position in global graph
  createdAt: string;
  updatedAt: string;
}

export type RelationType =
  | '朋友'
  | '同事'
  | '客户'
  | '亲戚'
  | '同学'
  | '介绍人'
  | '合作过'
  | '想维护'
  | string; // Allow custom types

export interface Relation {
  id: string;
  sourceId: string;
  targetId: string;
  type: RelationType;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ViewType = 'global' | 'preset' | 'custom';

export interface View {
  id: string;
  name: string;
  type: ViewType;
  icon?: string;
  personIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type PrivacyMode = 'full' | 'simple' | 'private' | 'custom';

export interface ExportOptions {
  scope: 'current_view' | 'person_focus';
  focusPersonId?: string;
  privacyMode: PrivacyMode;
  visibleFields: (keyof Person)[];
  template: 'minimal_white' | 'business_grey' | 'dark_tech' | 'warm_journal';
}

export interface BackupData {
  version: string;
  exportedAt: string;
  persons: Person[];
  relations: Relation[];
  views: View[];
}

// Predefined relation types
export const PRESET_RELATION_TYPES: RelationType[] = [
  '朋友',
  '同事',
  '客户',
  '亲戚',
  '同学',
  '介绍人',
  '合作过',
  '想维护',
];

// Person field labels for display
export const PERSON_FIELD_LABELS: Record<keyof Person, string> = {
  id: 'ID',
  name: '名字',
  avatar: '头像',
  city: '城市',
  title: '职位',
  company: '公司',
  tags: '标签',
  notes: '备注',
  contact: '联系方式',
  viewIds: '所属视图',
  position: '位置',
  createdAt: '创建时间',
  updatedAt: '更新时间',
};

// Exportable person fields (exclude internal fields)
export const EXPORTABLE_FIELDS: (keyof Person)[] = [
  'name',
  'avatar',
  'city',
  'title',
  'company',
  'tags',
  'notes',
  'contact',
];

// Color palette for person nodes
export const NODE_COLORS = [
  '#4f8cff',
  '#6c5ce7',
  '#00b894',
  '#fdcb6e',
  '#e17055',
  '#00cec9',
  '#a29bfe',
  '#ff7675',
  '#74b9ff',
  '#55efc4',
];

export function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function now(): string {
  return new Date().toISOString();
}
