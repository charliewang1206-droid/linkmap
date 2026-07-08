import { create } from 'zustand';

interface UIFilters {
  city?: string;
  title?: string;
  tags?: string[];
  company?: string;
}

interface UIState {
  selectedPersonId: string | null;
  focusedPersonId: string | null;
  isEditing: boolean;
  isExporting: boolean;
  searchQuery: string;
  activeFilters: UIFilters;
  isMobileSidebarOpen: boolean;

  setSelectedPerson: (id: string | null) => void;
  setFocusedPerson: (id: string | null) => void;
  clearFocus: () => void;
  setEditing: (editing: boolean) => void;
  setExporting: (exporting: boolean) => void;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: UIFilters) => void;
  clearFilters: () => void;
  toggleMobileSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedPersonId: null,
  focusedPersonId: null,
  isEditing: false,
  isExporting: false,
  searchQuery: '',
  activeFilters: {},
  isMobileSidebarOpen: false,

  setSelectedPerson: (id) => set({ selectedPersonId: id }),

  setFocusedPerson: (id) => set({ focusedPersonId: id }),

  clearFocus: () => set({ focusedPersonId: null }),

  setEditing: (editing) => set({ isEditing: editing }),

  setExporting: (exporting) => set({ isExporting: exporting }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setFilters: (filters) => set({ activeFilters: filters }),

  clearFilters: () => set({ activeFilters: {} }),

  toggleMobileSidebar: () =>
    set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen })),

  setMobileSidebarOpen: (open) => set({ isMobileSidebarOpen: open }),
}));
