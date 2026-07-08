import Dexie, { type EntityTable } from 'dexie';
import type { Person, Relation, View, Circle, AIProviderConfig, AppState } from '../types';

export class LinkMapDB extends Dexie {
  persons!: EntityTable<Person, 'id'>;
  relations!: EntityTable<Relation, 'id'>;
  views!: EntityTable<View, 'id'>;
  circles!: EntityTable<Circle, 'id'>;
  aiProviders!: EntityTable<AIProviderConfig, 'id'>;
  appState!: EntityTable<AppState, 'key'>;

  constructor() {
    super('LinkMapDB');

    this.version(1).stores({
      persons: 'id, name, *viewIds, *tags, city, company, updatedAt',
      relations: 'id, sourceId, targetId, type',
      views: 'id, name, type',
      appState: 'key',
    });

    // Version 2: Add circles, aiProviders tables; extend persons and views
    this.version(2).stores({
      persons: 'id, name, *viewIds, *tags, *circleIds, city, company, updatedAt',
      relations: 'id, sourceId, targetId, type',
      views: 'id, name, type, lastActiveAt',
      circles: 'id, name, *personIds, updatedAt',
      aiProviders: 'id, type, isDefault',
      appState: 'key',
    }).upgrade(async (tx) => {
      // Migrate existing persons: add circleIds default
      const persons = await tx.table('persons').toArray();
      for (const p of persons) {
        if (!('circleIds' in p)) {
          await tx.table('persons').update(p.id, { circleIds: [] });
        }
      }
      // Migrate existing views: add lastActiveAt and sortOrder defaults
      const views = await tx.table('views').toArray();
      for (const v of views) {
        let updates: Record<string, unknown> = {};
        if (!('lastActiveAt' in v)) {
          updates.lastActiveAt = (v as { updatedAt?: string }).updatedAt || new Date().toISOString();
        }
        if (!('sortOrder' in v)) {
          updates.sortOrder = 0;
        }
        if (Object.keys(updates).length > 0) {
          await tx.table('views').update(v.id, updates);
        }
      }
    });
  }
}

export const db = new LinkMapDB();
