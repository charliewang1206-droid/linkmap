import { create } from 'zustand';
import { db } from '../db';
import { generateId, now, type Circle } from '../types';

interface CircleState {
  circles: Circle[];
  isLoading: boolean;

  loadCircles: () => Promise<void>;
  createCircle: (data: { name: string; color: string; personIds?: string[]; notes?: string }) => Promise<Circle>;
  updateCircle: (id: string, data: Partial<Circle>) => Promise<void>;
  deleteCircle: (id: string) => Promise<void>;
  addPersonToCircle: (circleId: string, personId: string) => Promise<void>;
  removePersonFromCircle: (circleId: string, personId: string) => Promise<void>;
  getCirclesForPerson: (personId: string) => Circle[];
  updateCirclePosition: (id: string, position: { x: number; y: number }) => Promise<void>;
}

export const useCircleStore = create<CircleState>((set, get) => ({
  circles: [],
  isLoading: false,

  loadCircles: async () => {
    set({ isLoading: true });
    try {
      const circles = await db.circles.toArray();
      set({ circles });
    } finally {
      set({ isLoading: false });
    }
  },

  createCircle: async (data) => {
    const circle: Circle = {
      id: generateId(),
      name: data.name,
      color: data.color,
      personIds: data.personIds || [],
      notes: data.notes,
      createdAt: now(),
      updatedAt: now(),
    };
    await db.circles.add(circle);

    // Update all members' circleIds
    for (const personId of circle.personIds) {
      const person = await db.persons.get(personId);
      if (person) {
        await db.persons.update(personId, {
          circleIds: [...(person.circleIds || []), circle.id],
          updatedAt: now(),
        });
      }
    }

    set((state) => ({ circles: [...state.circles, circle] }));
    return circle;
  },

  updateCircle: async (id, data) => {
    await db.circles.update(id, { ...data, updatedAt: now() });
    set((state) => ({
      circles: state.circles.map((c) => (c.id === id ? { ...c, ...data, updatedAt: now() } : c)),
    }));
  },

  deleteCircle: async (id) => {
    const circle = get().circles.find((c) => c.id === id);
    if (!circle) return;

    // Remove circle from all members' circleIds
    for (const personId of circle.personIds) {
      const person = await db.persons.get(personId);
      if (person) {
        await db.persons.update(personId, {
          circleIds: (person.circleIds || []).filter((cid) => cid !== id),
          updatedAt: now(),
        });
      }
    }

    await db.circles.delete(id);
    set((state) => ({ circles: state.circles.filter((c) => c.id !== id) }));
  },

  addPersonToCircle: async (circleId, personId) => {
    const circle = get().circles.find((c) => c.id === circleId);
    if (!circle || circle.personIds.includes(personId)) return;

    const updatedPersonIds = [...circle.personIds, personId];
    await db.circles.update(circleId, { personIds: updatedPersonIds, updatedAt: now() });

    const person = await db.persons.get(personId);
    if (person) {
      await db.persons.update(personId, {
        circleIds: [...(person.circleIds || []), circleId],
        updatedAt: now(),
      });
    }

    set((state) => ({
      circles: state.circles.map((c) =>
        c.id === circleId ? { ...c, personIds: updatedPersonIds, updatedAt: now() } : c
      ),
    }));
  },

  removePersonFromCircle: async (circleId, personId) => {
    const circle = get().circles.find((c) => c.id === circleId);
    if (!circle) return;

    const updatedPersonIds = circle.personIds.filter((id) => id !== personId);
    await db.circles.update(circleId, { personIds: updatedPersonIds, updatedAt: now() });

    const person = await db.persons.get(personId);
    if (person) {
      await db.persons.update(personId, {
        circleIds: (person.circleIds || []).filter((cid) => cid !== circleId),
        updatedAt: now(),
      });
    }

    set((state) => ({
      circles: state.circles.map((c) =>
        c.id === circleId ? { ...c, personIds: updatedPersonIds, updatedAt: now() } : c
      ),
    }));
  },

  getCirclesForPerson: (personId) => {
    return get().circles.filter((c) => c.personIds.includes(personId));
  },

  updateCirclePosition: async (id, position) => {
    await db.circles.update(id, { position, updatedAt: now() });
    set((state) => ({
      circles: state.circles.map((c) =>
        c.id === id ? { ...c, position, updatedAt: now() } : c
      ),
    }));
  },
}));
