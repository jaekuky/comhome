import { create } from 'zustand';

export interface Company {
  id: string;
  name: string;
  address: string;
  district: string;
  latitude: number | null;
  longitude: number | null;
}

interface SearchState {
  selectedCompany: Company | null;
  setSelectedCompany: (company: Company | null) => void;
  recentSearches: Company[];
  addRecentSearch: (company: Company) => void;
  loadRecentSearches: () => void;
}

const RECENT_KEY = 'comhome_recent_searches';

export const useSearchStore = create<SearchState>((set, get) => ({
  selectedCompany: null,
  setSelectedCompany: (company) => set({ selectedCompany: company }),
  recentSearches: [],
  addRecentSearch: (company) => {
    const current = get().recentSearches.filter((c) => c.id !== company.id);
    const updated = [company, ...current].slice(0, 3);
    set({ recentSearches: updated });
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    } catch {}
  },
  loadRecentSearches: () => {
    try {
      const stored = localStorage.getItem(RECENT_KEY);
      if (stored) {
        set({ recentSearches: JSON.parse(stored) });
      }
    } catch {}
  },
}));
