import { create } from 'zustand';
import { db } from '../db';
import type { Person } from '../types';
import { generateId, now } from '../types';

interface PersonFilters {
  city?: string;
  title?: string;
  tags?: string[];
  company?: string;
}

interface PersonState {
  persons: Person[];
  isLoading: boolean;

  loadPersons: () => Promise<void>;
  addPerson: (data: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Person>;
  updatePerson: (id: string, data: Partial<Person>) => Promise<void>;
  deletePerson: (id: string) => Promise<void>;
  getPerson: (id: string) => Person | undefined;
  getPersonsByView: (viewId: string) => Person[];
  searchPersons: (query: string) => Person[];
  filterPersons: (filters: PersonFilters) => Person[];
  importPersons: (persons: Person[]) => Promise<void>;
}

export const usePersonStore = create<PersonState>((set, get) => ({
  persons: [],
  isLoading: false,

  loadPersons: async () => {
    set({ isLoading: true });
    const persons = await db.persons.toArray();
    set({ persons, isLoading: false });
  },

  addPerson: async (data) => {
    const person: Person = {
      ...data,
      id: generateId(),
      createdAt: now(),
      updatedAt: now(),
    };
    await db.persons.add(person);
    set((state) => ({ persons: [...state.persons, person] }));
    return person;
  },

  updatePerson: async (id, data) => {
    const updates = { ...data, updatedAt: now() };
    await db.persons.update(id, updates);
    set((state) => ({
      persons: state.persons.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    }));
  },

  deletePerson: async (id) => {
    // Delete all relations involving this person
    const relatedRelations = await db.relations
      .where('sourceId')
      .equals(id)
      .or('targetId')
      .equals(id)
      .toArray();
    await db.relations.bulkDelete(relatedRelations.map((r) => r.id));

    await db.persons.delete(id);
    set((state) => ({
      persons: state.persons.filter((p) => p.id !== id),
    }));
  },

  getPerson: (id) => {
    return get().persons.find((p) => p.id === id);
  },

  getPersonsByView: (viewId) => {
    return get().persons.filter((p) => p.viewIds.includes(viewId));
  },

  searchPersons: (query) => {
    const q = query.toLowerCase();
    return get().persons.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.company && p.company.toLowerCase().includes(q)) ||
        (p.city && p.city.toLowerCase().includes(q)) ||
        (p.title && p.title.toLowerCase().includes(q))
    );
  },

  filterPersons: (filters) => {
    return get().persons.filter((p) => {
      if (filters.city && p.city !== filters.city) return false;
      if (filters.title && !p.title?.includes(filters.title)) return false;
      if (filters.company && p.company !== filters.company) return false;
      if (filters.tags && filters.tags.length > 0) {
        const hasTag = filters.tags.some((t) => p.tags.includes(t));
        if (!hasTag) return false;
      }
      return true;
    });
  },

  importPersons: async (persons) => {
    const now_ = now();
    const personsWithTimestamps = persons.map((p) => ({
      ...p,
      updatedAt: now_,
    }));
    await db.persons.bulkPut(personsWithTimestamps);
    await get().loadPersons();
  },
}));
