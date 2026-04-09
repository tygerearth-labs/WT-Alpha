import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Locale } from '@/i18n';
import type { CurrencyCode } from '@/lib/currency';

interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      locale: 'id',
      currency: 'IDR',

      setLocale: (locale) => set({ locale }),
      setCurrency: (currency) => set({ currency }),
    }),
    {
      name: 'i18n-storage',
      partialize: (state) => ({
        locale: state.locale,
        currency: state.currency,
      }),
    }
  )
);
