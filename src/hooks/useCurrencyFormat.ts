'use client';

import { useCallback } from 'react';
import { useI18nStore } from '@/store/useI18nStore';
import { formatCurrency, formatNumber as dynFormatNumber, getCurrencySymbol, getIdrToCurrencyRate, type CurrencyCode } from '@/lib/currency';

/**
 * Hook for dynamic currency formatting with auto-conversion from base currency (IDR).
 *
 * DB stores amounts as raw numbers in the user's base currency (default IDR).
 * When user switches display currency, amounts are auto-converted using exchange rates.
 *
 * Usage:
 *   const { formatAmount, formatNum, symbol, currency } = useCurrencyFormat();
 *   formatAmount(8500000)  → "Rp8.500.000" (if IDR) or "$552.50" (if USD)
 */
export function useCurrencyFormat() {
  const { currency } = useI18nStore();

  /**
   * Format amount with currency conversion.
   * Amounts from DB are assumed to be in base currency (IDR).
   * They get converted to the selected display currency.
   */
  const formatAmount = useCallback(
    (amount: number, overrideCurrency?: CurrencyCode) => {
      const targetCurrency = overrideCurrency ?? currency;

      // If target is IDR (base currency), no conversion needed
      if (targetCurrency === 'IDR') {
        return formatCurrency(amount, 'IDR');
      }

      // Convert from IDR to target currency
      const rate = getIdrToCurrencyRate(targetCurrency);
      const converted = amount * rate;
      return formatCurrency(converted, targetCurrency);
    },
    [currency],
  );

  /**
   * Format number without currency symbol, but with locale-aware grouping.
   */
  const formatNum = useCallback(
    (amount: number, overrideCurrency?: CurrencyCode) => {
      const targetCurrency = overrideCurrency ?? currency;

      if (targetCurrency === 'IDR') {
        return dynFormatNumber(amount, 'IDR');
      }

      const rate = getIdrToCurrencyRate(targetCurrency);
      const converted = amount * rate;
      return dynFormatNumber(converted, targetCurrency);
    },
    [currency],
  );

  /**
   * Convert amount to target currency without formatting (raw number).
   * Useful for calculations, charts, etc.
   */
  const convertAmount = useCallback(
    (amount: number, overrideCurrency?: CurrencyCode) => {
      const targetCurrency = overrideCurrency ?? currency;

      if (targetCurrency === 'IDR') return amount;

      const rate = getIdrToCurrencyRate(targetCurrency);
      return amount * rate;
    },
    [currency],
  );

  const symbol = getCurrencySymbol(currency);
  const rate = getIdrToCurrencyRate(currency);

  return {
    formatAmount,
    formatNum,
    convertAmount,
    symbol,
    currency,
    rate,
  };
}
