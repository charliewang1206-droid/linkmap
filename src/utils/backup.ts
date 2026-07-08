import { db } from '../db';
import type { BackupData, Person, Relation, View, Circle, AIProviderConfig } from '../types';
import { now } from '../types';

const BACKUP_VERSION = '1.0.0';

function isPerson(obj: unknown): obj is Person {
  if (!obj || typeof obj !== 'object') return false;
  const p = obj as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    Array.isArray(p.tags) &&
    Array.isArray(p.viewIds) &&
    typeof p.createdAt === 'string' &&
    typeof p.updatedAt === 'string'
  );
}

function isRelation(obj: unknown): obj is Relation {
  if (!obj || typeof obj !== 'object') return false;
  const r = obj as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.sourceId === 'string' &&
    typeof r.targetId === 'string' &&
    typeof r.type === 'string' &&
    typeof r.createdAt === 'string' &&
    typeof r.updatedAt === 'string'
  );
}

function isView(obj: unknown): obj is View {
  if (!obj || typeof obj !== 'object') return false;
  const v = obj as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.type === 'string' &&
    Array.isArray(v.personIds) &&
    typeof v.createdAt === 'string' &&
    typeof v.updatedAt === 'string'
  );
}

export function validateBackup(data: unknown): data is BackupData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;

  if (typeof d.version !== 'string') return false;
  if (typeof d.exportedAt !== 'string') return false;

  if (!Array.isArray(d.persons)) return false;
  if (!d.persons.every(isPerson)) return false;

  if (!Array.isArray(d.relations)) return false;
  if (!d.relations.every(isRelation)) return false;

  if (!Array.isArray(d.views)) return false;
  if (!d.views.every(isView)) return false;

  return true;
}

export async function exportBackup(): Promise<void> {
  const [persons, relations, views, circles, aiProviders] = await Promise.all([
    db.persons.toArray(),
    db.relations.toArray(),
    db.views.toArray(),
    db.circles.toArray(),
    db.aiProviders.toArray(),
  ]);

  const backup: BackupData = {
    version: BACKUP_VERSION,
    exportedAt: now(),
    persons,
    relations,
    views,
    circles,
    aiProviders,
  };

  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `linkmap-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function importBackup(
  file: File
): Promise<{ persons: Person[]; relations: Relation[]; views: View[]; circles: Circle[]; aiProviders: AIProviderConfig[] } | null> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);

        if (!validateBackup(data)) {
          reject(new Error('无效的备份文件格式'));
          return;
        }

        resolve({
          persons: data.persons,
          relations: data.relations,
          views: data.views,
          circles: data.circles || [],
          aiProviders: data.aiProviders || [],
        });
      } catch {
        reject(new Error('无法解析备份文件'));
      }
    };

    reader.onerror = () => {
      reject(new Error('读取文件失败'));
    };

    reader.readAsText(file);
  });
}

export async function getStorageUsage(): Promise<{
  used: number;
  quota: number;
  percentage: number;
}> {
  let used = 0;
  let quota = 0;

  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    used = estimate.usage ?? 0;
    quota = estimate.quota ?? 0;
  } else {
    // Fallback: estimate from our data
    const [persons, relations, views] = await Promise.all([
      db.persons.toArray(),
      db.relations.toArray(),
      db.views.toArray(),
    ]);
    const json = JSON.stringify({ persons, relations, views });
    used = new Blob([json]).size;
  }

  return {
    used,
    quota,
    percentage: quota > 0 ? (used / quota) * 100 : 0,
  };
}
