import { create } from 'zustand';
import { db } from '../db';
import type { Relation, RelationType } from '../types';
import { generateId, now } from '../types';

interface RelationState {
  relations: Relation[];
  isLoading: boolean;

  loadRelations: () => Promise<void>;
  addRelation: (sourceId: string, targetId: string, type: RelationType) => Promise<Relation>;
  updateRelation: (id: string, data: Partial<Relation>) => Promise<void>;
  deleteRelation: (id: string) => Promise<void>;
  getRelationsForPerson: (personId: string) => Relation[];
  getRelationsBetween: (p1: string, p2: string) => Relation[];
  getFirstDegreeRelations: (personId: string) => Relation[];
  getSecondDegreeRelations: (personId: string) => Relation[];
  importRelations: (relations: Relation[]) => Promise<void>;
}

export const useRelationStore = create<RelationState>((set, get) => ({
  relations: [],
  isLoading: false,

  loadRelations: async () => {
    set({ isLoading: true });
    const relations = await db.relations.toArray();
    set({ relations, isLoading: false });
  },

  addRelation: async (sourceId, targetId, type) => {
    const relation: Relation = {
      id: generateId(),
      sourceId,
      targetId,
      type,
      createdAt: now(),
      updatedAt: now(),
    };
    await db.relations.add(relation);
    set((state) => ({ relations: [...state.relations, relation] }));
    return relation;
  },

  updateRelation: async (id, data) => {
    const updates = { ...data, updatedAt: now() };
    await db.relations.update(id, updates);
    set((state) => ({
      relations: state.relations.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    }));
  },

  deleteRelation: async (id) => {
    await db.relations.delete(id);
    set((state) => ({
      relations: state.relations.filter((r) => r.id !== id),
    }));
  },

  getRelationsForPerson: (personId) => {
    return get().relations.filter(
      (r) => r.sourceId === personId || r.targetId === personId
    );
  },

  getRelationsBetween: (p1, p2) => {
    return get().relations.filter(
      (r) =>
        (r.sourceId === p1 && r.targetId === p2) ||
        (r.sourceId === p2 && r.targetId === p1)
    );
  },

  getFirstDegreeRelations: (personId) => {
    return get().relations.filter(
      (r) => r.sourceId === personId || r.targetId === personId
    );
  },

  getSecondDegreeRelations: (personId) => {
    const { relations } = get();

    // First-degree person IDs (excluding self)
    const firstDegreeIds = new Set<string>();
    for (const r of relations) {
      if (r.sourceId === personId) firstDegreeIds.add(r.targetId);
      if (r.targetId === personId) firstDegreeIds.add(r.sourceId);
    }

    // Second-degree: relations where one side is a first-degree person,
    // excluding relations that involve self or are already first-degree
    const result: Relation[] = [];
    const seen = new Set<string>();
    for (const r of relations) {
      const otherEnd =
        r.sourceId === personId || firstDegreeIds.has(r.sourceId)
          ? r.targetId
          : r.targetId === personId || firstDegreeIds.has(r.targetId)
            ? r.sourceId
            : null;
      if (otherEnd === null) continue;

      // Exclude self and first-degree persons
      if (otherEnd === personId || firstDegreeIds.has(otherEnd)) continue;

      if (!seen.has(r.id)) {
        seen.add(r.id);
        result.push(r);
      }
    }

    return result;
  },

  importRelations: async (relations) => {
    const now_ = now();
    const relationsWithTimestamps = relations.map((r) => ({
      ...r,
      updatedAt: now_,
    }));
    await db.relations.bulkPut(relationsWithTimestamps);
    await get().loadRelations();
  },
}));
