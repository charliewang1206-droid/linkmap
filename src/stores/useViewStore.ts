import { create } from 'zustand';
import { db } from '../db';
import type { View } from '../types';
import { generateId, now } from '../types';

const DEFAULT_VIEWS: Omit<View, 'personIds' | 'createdAt' | 'updatedAt' | 'lastActiveAt' | 'sortOrder'>[] = [
  { id: 'view-global', name: '全局', type: 'global' },
  { id: 'view-work', name: '职业', type: 'preset', icon: '💼' },
  { id: 'view-family', name: '家庭', type: 'preset', icon: '🏠' },
  { id: 'view-friends', name: '朋友', type: 'preset', icon: '👥' },
];

// Sort views: global first, then presets, then customs by lastActiveAt desc
const sortViews = (vs: View[]): View[] => {
  return [...vs].sort((a, b) => {
    if (a.type === 'global') return -1;
    if (b.type === 'global') return 1;
    if (a.type === 'preset' && b.type === 'custom') return -1;
    if (a.type === 'custom' && b.type === 'preset') return 1;
    return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
  });
};

interface ViewState {
  views: View[];
  currentViewId: string;
  isLoading: boolean;

  loadViews: () => Promise<void>;
  createView: (name: string, icon?: string) => Promise<View>;
  deleteView: (id: string) => Promise<void>;
  renameView: (id: string, name: string) => Promise<void>;
  addPersonToView: (viewId: string, personId: string) => Promise<void>;
  removePersonFromView: (viewId: string, personId: string) => Promise<void>;
  setCurrentView: (viewId: string) => void;
  touchView: (viewId: string) => Promise<void>;
}

export const useViewStore = create<ViewState>((set, get) => ({
  views: [],
  currentViewId: 'view-global',
  isLoading: false,

  loadViews: async () => {
    set({ isLoading: true });
    let views = await db.views.toArray();

    // Initialize default views if they don't exist
    if (views.length === 0) {
      const now_ = now();
      const defaultViews: View[] = DEFAULT_VIEWS.map((v) => ({
        ...v,
        personIds: [],
        lastActiveAt: now_,
        sortOrder: 0,
        createdAt: now_,
        updatedAt: now_,
      }));
      await db.views.bulkAdd(defaultViews);
      views = defaultViews;
    }

    // Ensure all views have lastActiveAt (migration safety)
    for (const v of views) {
      if (!v.lastActiveAt) {
        await db.views.update(v.id, { lastActiveAt: v.updatedAt });
        v.lastActiveAt = v.updatedAt;
      }
      if (v.sortOrder === undefined) {
        await db.views.update(v.id, { sortOrder: 0 });
        v.sortOrder = 0;
      }
    }

    const sorted = sortViews(views);
    set({ views: sorted, isLoading: false });
  },

  createView: async (name, icon) => {
    const now_ = now();
    const view: View = {
      id: generateId(),
      name,
      type: 'custom',
      icon,
      personIds: [],
      lastActiveAt: now_,
      sortOrder: 0,
      createdAt: now_,
      updatedAt: now_,
    };
    await db.views.add(view);
    set((state) => ({ views: sortViews([...state.views, view]) }));
    return view;
  },

  deleteView: async (id) => {
    const view = get().views.find((v) => v.id === id);
    if (!view || view.type === 'global') return;

    // Remove this view from all persons' viewIds
    const persons = await db.persons
      .where('viewIds')
      .equals(id)
      .toArray();
    for (const p of persons) {
      await db.persons.update(p.id, {
        viewIds: p.viewIds.filter((vid) => vid !== id),
        updatedAt: now(),
      });
    }

    await db.views.delete(id);
    set((state) => ({
      views: state.views.filter((v) => v.id !== id),
      currentViewId:
        state.currentViewId === id ? 'view-global' : state.currentViewId,
    }));
  },

  renameView: async (id, name) => {
    const updates = { name, updatedAt: now() };
    await db.views.update(id, updates);
    set((state) => ({
      views: state.views.map((v) => (v.id === id ? { ...v, ...updates } : v)),
    }));
  },

  addPersonToView: async (viewId, personId) => {
    const view = get().views.find((v) => v.id === viewId);
    if (!view || view.personIds.includes(personId)) return;

    const updatedPersonIds = [...view.personIds, personId];
    const now_ = now();
    await db.views.update(viewId, {
      personIds: updatedPersonIds,
      lastActiveAt: now_,
      updatedAt: now_,
    });

    // Also update the person's viewIds
    const person = await db.persons.get(personId);
    if (person && !person.viewIds.includes(viewId)) {
      await db.persons.update(personId, {
        viewIds: [...person.viewIds, viewId],
        updatedAt: now_,
      });
    }

    set((state) => ({
      views: sortViews(state.views.map((v) =>
        v.id === viewId ? { ...v, personIds: updatedPersonIds, lastActiveAt: now_ } : v
      )),
    }));
  },

  removePersonFromView: async (viewId, personId) => {
    const view = get().views.find((v) => v.id === viewId);
    if (!view) return;

    const updatedPersonIds = view.personIds.filter((id) => id !== personId);
    await db.views.update(viewId, {
      personIds: updatedPersonIds,
      updatedAt: now(),
    });

    // Also update the person's viewIds
    const person = await db.persons.get(personId);
    if (person) {
      await db.persons.update(personId, {
        viewIds: person.viewIds.filter((vid) => vid !== viewId),
        updatedAt: now(),
      });
    }

    set((state) => ({
      views: state.views.map((v) =>
        v.id === viewId ? { ...v, personIds: updatedPersonIds } : v
      ),
    }));
  },

  setCurrentView: (viewId) => {
    set({ currentViewId: viewId });
  },

  touchView: async (viewId) => {
    const now_ = now();
    await db.views.update(viewId, { lastActiveAt: now_, updatedAt: now_ });
    set((state) => ({
      views: sortViews(state.views.map((v) =>
        v.id === viewId ? { ...v, lastActiveAt: now_ } : v
      )),
    }));
  },
}));
