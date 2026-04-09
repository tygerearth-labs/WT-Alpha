import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatCurrency } from "@/lib/currency"
import type { CurrencyCode } from "@/lib/currency"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format currency with a specific currency code.
 * Defaults to IDR for backward compatibility.
 *
 * NOTE: For dynamic user-preferred currency, use the `useCurrencyFormat()` hook
 * or call `getCurrencyFormat(amount, userCurrency)` from components.
 */
export function getCurrencyFormat(amount: number, currencyCode: CurrencyCode = 'IDR'): string {
  return formatCurrency(amount, currencyCode);
}

/**
 * Format a plain number (no currency symbol) with locale-appropriate grouping.
 */
export function formatNumber(amount: number, currencyCode: CurrencyCode = 'IDR'): string {
  return new Intl.NumberFormat('en-US').format(amount);
}
