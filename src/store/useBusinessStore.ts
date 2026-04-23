import { create } from 'zustand';

export type BusinessMode = 'personal' | 'bisnis' | 'investasi';
export type BusinessCategory = 'bisnis' | 'investasi';

export interface BusinessProfile {
  id: string;
  name: string;
  category: BusinessCategory;
  description?: string;
  address?: string;
  phone?: string;
  isActive: boolean;
}

interface BusinessState {
  mode: BusinessMode;
  businesses: BusinessProfile[];
  activeBusiness: BusinessProfile | null;
  isLoading: boolean;
  
  // Actions
  setMode: (mode: BusinessMode) => void;
  setBusinesses: (businesses: BusinessProfile[]) => void;
  setActiveBusiness: (business: BusinessProfile | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useBusinessStore = create<BusinessState>()((set) => ({
  mode: 'personal',
  businesses: [],
  activeBusiness: null,
  isLoading: false,

  setMode: (mode) => set({ mode }),
  setBusinesses: (businesses) => set({ businesses }),
  setActiveBusiness: (business) => set({ activeBusiness: business }),
  setLoading: (loading) => set({ isLoading: loading }),
  reset: () => set({ mode: 'personal', activeBusiness: null }),
}));
