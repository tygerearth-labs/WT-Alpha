'use client';

import { useI18nStore } from '@/store/useI18nStore';
import { localeMap, getNestedValue, interpolate } from '@/i18n';

/**
 * Translation hook — returns a `t()` function.
 *
 * Usage:
 *   const { t, locale, setLocale } = useTranslation();
 *   t('kas.totalIncome')           → "Total Pemasukan"
 *   t('filter.showAll', { count }) → "Lihat Semua (42)"
 */
export function useTranslation() {
  const { locale, setLocale, currency, setCurrency } = useI18nStore();

  function t(key: string, params?: Record<string, string | number>): string {
    const messages = localeMap[locale];
    const raw = getNestedValue(messages, key);
    return interpolate(raw, params);
  }

  return {
    t,
    locale,
    setLocale,
    currency,
    setCurrency,
  };
}
