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
  circleIds: string[];     // Which circles this person belongs to
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
  lastActiveAt: string;   // Last activity time for sorting
  sortOrder: number;       // Manual sort order
  createdAt: string;
  updatedAt: string;
}

// --- Circle (圈子) ---
export interface Circle {
  id: string;
  name: string;
  color: string;           // Theme color (hex)
  personIds: string[];     // Members
  notes?: string;
  position?: { x: number; y: number };  // Bounding box position
  size?: { width: number; height: number };
  createdAt: string;
  updatedAt: string;
}

// --- AI Provider Configuration ---
export type AIProviderType = 'openai' | 'anthropic' | 'custom';

export interface AIProviderConfig {
  id: string;
  type: AIProviderType;
  name: string;
  apiKeyEncrypted: string;  // Web Crypto encrypted (Base64)
  apiKeyIV: string;          // Encryption IV (Base64)
  baseURL?: string;          // Custom API endpoint
  model?: string;            // Model name
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- AI Batch Import ---
export interface ParsedPerson {
  name: string;
  city?: string;
  title?: string;
  company?: string;
  tags?: string[];
  notes?: string;
}

export interface ParsedRelation {
  fromName: string;
  toName: string;
  type: string;
}

export interface BatchImportResult {
  persons: ParsedPerson[];
  relations: ParsedRelation[];
}

// --- App State ---
export interface AppState {
  key: string;
  value: unknown;
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
  circles: Circle[];
  aiProviders: AIProviderConfig[];
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

// Circle color palette
export const CIRCLE_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f43f5e', // rose
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
];

// Person field labels for display
export const PERSON_FIELD_LABELS: Record<string, string> = {
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
  circleIds: '所属圈子',
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
