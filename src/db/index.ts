import Dexie, { type EntityTable } from 'dexie';
import type { Person, Relation, View } from '../types';

interface AppState {
  key: string;
  value: unknown;
}

export class LinkMapDB extends Dexie {
  persons!: EntityTable<Person, 'id'>;
  relations!: EntityTable<Relation, 'id'>;
  views!: EntityTable<View, 'id'>;
  appState!: EntityTable<AppState, 'key'>;

  constructor() {
    super('LinkMapDB');

    this.version(1).stores({
      persons: 'id, name, *viewIds, *tags, city, company, updatedAt',
      relations: 'id, sourceId, targetId, type',
      views: 'id, name, type',
      appState: 'key',
    });
  }
}

export const db = new LinkMapDB();
