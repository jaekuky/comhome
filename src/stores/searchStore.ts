import { create } from 'zustand';
import { type NeighborhoodResult } from '@/components/result/NeighborhoodCard';
import { type CommuteResult } from '@/lib/commuteService';

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
  commuteResults: CommuteResult[];
  setCommuteResults: (results: CommuteResult[]) => void;
}

const RECENT_KEY = 'comhome_recent_searches';

function isValidCompany(item: unknown): item is Company {
  if (typeof item !== 'object' || item === null) return false;
  const obj = item as Record<string, unknown>;
  return typeof obj.id === 'string' && typeof obj.name === 'string' && typeof obj.address === 'string' && typeof obj.district === 'string';
}

export const useSearchStore = create<SearchState>((set, get) => ({
  selectedCompany: null,
  setSelectedCompany: (company) => {
    const prev = get().selectedCompany;
    // 회사가 바뀌면 이전 회사의 통근 데이터를 클리어
    if (prev?.id !== company?.id) {
      set({ selectedCompany: company, commuteResults: [] });
    } else {
      set({ selectedCompany: company });
    }
  },
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
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(isValidCompany);
          set({ recentSearches: valid });
        }
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
  commuteResults: [],
  setCommuteResults: (results) => set({ commuteResults: results }),
}));
