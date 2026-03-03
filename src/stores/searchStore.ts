import { create } from 'zustand';
import { type NeighborhoodResult } from '@/components/result/NeighborhoodCard';

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
  compareList: NeighborhoodResult[];
  addToCompare: (item: NeighborhoodResult) => boolean;
  removeFromCompare: (id: string) => void;
  clearCompare: () => void;
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
    } catch (_e) { /* localStorage unavailable */ }
  },
  loadRecentSearches: () => {
    try {
      const stored = localStorage.getItem(RECENT_KEY);
      if (stored) {
        set({ recentSearches: JSON.parse(stored) });
      }
    } catch (_e) { /* localStorage unavailable */ }
  },
  compareList: [],
  addToCompare: (item) => {
    const list = get().compareList;
    if (list.length >= 3) return false;
    if (list.some((c) => c.id === item.id)) return false;
    set({ compareList: [...list, item] });
    return true;
  },
  removeFromCompare: (id) => {
    set({ compareList: get().compareList.filter((c) => c.id !== id) });
  },
  clearCompare: () => set({ compareList: [] }),
}));
