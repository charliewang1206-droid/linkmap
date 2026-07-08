import { create } from 'zustand';
import { db } from '../db';
import type { View } from '../types';
import { generateId, now } from '../types';

const DEFAULT_VIEWS: Omit<View, 'personIds' | 'createdAt' | 'updatedAt'>[] = [
  { id: 'view-global', name: '全局', type: 'global' },
  { id: 'view-work', name: '职业', type: 'preset', icon: '💼' },
  { id: 'view-family', name: '家庭', type: 'preset', icon: '🏠' },
  { id: 'view-friends', name: '朋友', type: 'preset', icon: '👥' },
];

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
        createdAt: now_,
        updatedAt: now_,
      }));
      await db.views.bulkAdd(defaultViews);
      views = defaultViews;
    }

    set({ views, isLoading: false });
  },

  createView: async (name, icon) => {
    const view: View = {
      id: generateId(),
      name,
      type: 'custom',
      icon,
      personIds: [],
      createdAt: now(),
      updatedAt: now(),
    };
    await db.views.add(view);
    set((state) => ({ views: [...state.views, view] }));
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
    await db.views.update(viewId, {
      personIds: updatedPersonIds,
      updatedAt: now(),
    });

    // Also update the person's viewIds
    const person = await db.persons.get(personId);
    if (person && !person.viewIds.includes(viewId)) {
      await db.persons.update(personId, {
        viewIds: [...person.viewIds, viewId],
        updatedAt: now(),
      });
    }

    set((state) => ({
      views: state.views.map((v) =>
        v.id === viewId ? { ...v, personIds: updatedPersonIds } : v
      ),
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
}));
