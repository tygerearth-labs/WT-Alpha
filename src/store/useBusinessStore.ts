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

export type BizPageType =
  | 'biz-dashboard' | 'biz-kas' | 'biz-penjualan' | 'biz-invoice' | 'biz-customer'
  | 'biz-hutang' | 'biz-allocation' | 'biz-laporan' | 'biz-invoice-settings';

interface BusinessState {
  mode: BusinessMode;
  businesses: BusinessProfile[];
  activeBusiness: BusinessProfile | null;
  isLoading: boolean;
  requestedPage: BizPageType | null;
  
  // Actions
  setMode: (mode: BusinessMode) => void;
  setBusinesses: (businesses: BusinessProfile[]) => void;
  setActiveBusiness: (business: BusinessProfile | null) => void;
  setLoading: (loading: boolean) => void;
  requestPage: (page: BizPageType) => void;
  reset: () => void;
}

export const useBusinessStore = create<BusinessState>()((set) => ({
  mode: 'personal',
  businesses: [],
  activeBusiness: null,
  isLoading: false,
  requestedPage: null,

  setMode: (mode) => set({ mode }),
  setBusinesses: (businesses) => set({ businesses }),
  setActiveBusiness: (business) => set({ activeBusiness: business }),
  setLoading: (loading) => set({ isLoading: loading }),
  requestPage: (page) => set({ requestedPage: page }),
  reset: () => set({ mode: 'personal', activeBusiness: null, requestedPage: null }),
}));
