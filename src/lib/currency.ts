export type CurrencyCode =
  | 'IDR' | 'USD' | 'EUR' | 'GBP' | 'JPY'
  | 'SGD' | 'MYR' | 'AUD' | 'CAD' | 'CHF'
  | 'KRW' | 'CNY' | 'THB' | 'PHP' | 'INR'
  | 'BRL' | 'MXN' | 'ZAR' | 'AED' | 'SAR'
  | 'TWD' | 'HKD' | 'NZD' | 'SEK' | 'NOK'
  | 'DKK' | 'PLN' | 'CZK' | 'HUF' | 'RON'
  | 'BGN' | 'TRY' | 'RUB' | 'UAH' | 'VND'
  | 'NGN' | 'EGP' | 'PKR' | 'BDT' | 'LKR';

export interface CurrencyInfo {
  code: CurrencyCode;
  name: string;          // e.g. "Indonesian Rupiah"
  symbol: string;         // e.g. "Rp"
  locale: string;         // Intl locale, e.g. "id-ID"
  decimals: number;       // decimal places (0 for JPY, 2 for USD)
  position: 'before' | 'after'; // symbol position
  space: boolean;         // space between symbol and number
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  IDR: { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', locale: 'id-ID', decimals: 0, position: 'before', space: false },
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', locale: 'en-US', decimals: 2, position: 'before', space: false },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', locale: 'de-DE', decimals: 2, position: 'before', space: false },
  GBP: { code: 'GBP', name: 'British Pound', symbol: '£', locale: 'en-GB', decimals: 2, position: 'before', space: false },
  JPY: { code: 'JPY', name: 'Japanese Yen', symbol: '¥', locale: 'ja-JP', decimals: 0, position: 'before', space: false },
  SGD: { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', locale: 'en-SG', decimals: 2, position: 'before', space: false },
  MYR: { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', locale: 'ms-MY', decimals: 2, position: 'before', space: false },
  AUD: { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', locale: 'en-AU', decimals: 2, position: 'before', space: false },
  CAD: { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', locale: 'en-CA', decimals: 2, position: 'before', space: false },
  CHF: { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', locale: 'de-CH', decimals: 2, position: 'before', space: true },
  KRW: { code: 'KRW', name: 'Korean Won', symbol: '₩', locale: 'ko-KR', decimals: 0, position: 'before', space: false },
  CNY: { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', locale: 'zh-CN', decimals: 2, position: 'before', space: false },
  THB: { code: 'THB', name: 'Thai Baht', symbol: '฿', locale: 'th-TH', decimals: 2, position: 'before', space: false },
  PHP: { code: 'PHP', name: 'Philippine Peso', symbol: '₱', locale: 'en-PH', decimals: 2, position: 'before', space: false },
  INR: { code: 'INR', name: 'Indian Rupee', symbol: '₹', locale: 'en-IN', decimals: 2, position: 'before', space: false },
  BRL: { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', locale: 'pt-BR', decimals: 2, position: 'before', space: false },
  MXN: { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$', locale: 'es-MX', decimals: 2, position: 'before', space: false },
  ZAR: { code: 'ZAR', name: 'South African Rand', symbol: 'R', locale: 'en-ZA', decimals: 2, position: 'before', space: false },
  AED: { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', locale: 'ar-AE', decimals: 2, position: 'before', space: true },
  SAR: { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', locale: 'ar-SA', decimals: 2, position: 'before', space: true },
  TWD: { code: 'TWD', name: 'Taiwan Dollar', symbol: 'NT$', locale: 'zh-TW', decimals: 2, position: 'before', space: false },
  HKD: { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', locale: 'en-HK', decimals: 2, position: 'before', space: false },
  NZD: { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', locale: 'en-NZ', decimals: 2, position: 'before', space: false },
  SEK: { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', locale: 'sv-SE', decimals: 2, position: 'after', space: true },
  NOK: { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', locale: 'nb-NO', decimals: 2, position: 'after', space: true },
  DKK: { code: 'DKK', name: 'Danish Krone', symbol: 'kr', locale: 'da-DK', decimals: 2, position: 'after', space: true },
  PLN: { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', locale: 'pl-PL', decimals: 2, position: 'after', space: true },
  CZK: { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', locale: 'cs-CZ', decimals: 2, position: 'after', space: true },
  HUF: { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', locale: 'hu-HU', decimals: 0, position: 'after', space: true },
  RON: { code: 'RON', name: 'Romanian Leu', symbol: 'lei', locale: 'ro-RO', decimals: 2, position: 'after', space: true },
  BGN: { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв', locale: 'bg-BG', decimals: 2, position: 'after', space: true },
  TRY: { code: 'TRY', name: 'Turkish Lira', symbol: '₺', locale: 'tr-TR', decimals: 2, position: 'before', space: false },
  RUB: { code: 'RUB', name: 'Russian Ruble', symbol: '₽', locale: 'ru-RU', decimals: 2, position: 'before', space: false },
  UAH: { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴', locale: 'uk-UA', decimals: 2, position: 'before', space: false },
  VND: { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', locale: 'vi-VN', decimals: 0, position: 'after', space: true },
  NGN: { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', locale: 'en-NG', decimals: 2, position: 'before', space: false },
  EGP: { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£', locale: 'ar-EG', decimals: 2, position: 'before', space: false },
  PKR: { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', locale: 'ur-PK', decimals: 2, position: 'before', space: false },
  BDT: { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', locale: 'bn-BD', decimals: 2, position: 'before', space: false },
  LKR: { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs', locale: 'si-LK', decimals: 2, position: 'before', space: false },
};

/** Popular currencies for quick picker */
export const POPULAR_CURRENCIES: CurrencyCode[] = [
  'IDR', 'USD', 'EUR', 'GBP', 'JPY', 'SGD', 'MYR', 'AUD',
  'KRW', 'CNY', 'THB', 'INR', 'PHP', 'BRL', 'AED',
];

/**
 * Format amount with dynamic currency
 */
export function formatCurrency(amount: number, currencyCode: CurrencyCode = 'IDR'): string {
  const info = CURRENCIES[currencyCode];
  if (!info) {
    // Fallback to IDR
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  try {
    return new Intl.NumberFormat(info.locale, {
      style: 'currency',
      currency: info.code,
      minimumFractionDigits: info.decimals,
      maximumFractionDigits: info.decimals,
    }).format(amount);
  } catch {
    // Fallback for unsupported locales
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: info.decimals,
      maximumFractionDigits: info.decimals,
    }).format(amount);

    if (info.position === 'before') {
      return `${info.symbol}${info.space ? ' ' : ''}${formatted}`;
    } else {
      return `${formatted}${info.space ? ' ' : ''}${info.symbol}`;
    }
  }
}

/**
 * Format number (no currency symbol)
 */
export function formatNumber(amount: number, currencyCode: CurrencyCode = 'IDR'): string {
  const info = CURRENCIES[currencyCode];
  const locale = info?.locale || 'en-US';
  return new Intl.NumberFormat(locale).format(amount);
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(code: CurrencyCode): string {
  return CURRENCIES[code]?.symbol || code;
}

/**
 * Get exchange rate multiplier from IDR.
 * NOTE: In production, fetch from a real API. This is a simplified static mapping.
 * Since amounts in DB are stored as raw numbers (assumed IDR for existing data),
 * new users with different currencies will enter amounts in their chosen currency.
 * Only use conversion if you implement a cross-currency feature.
 */
export function getIdrToCurrencyRate(currencyCode: CurrencyCode): number {
  // Approximate exchange rates: 1 IDR → X target currency (as of 2026)
  const rates: Record<string, number> = {
    IDR: 1,
    USD: 0.0000635,
    EUR: 0.0000594,
    GBP: 0.0000512,
    JPY: 0.00972,
    SGD: 0.0000862,
    MYR: 0.000288,
    AUD: 0.0001012,
    CAD: 0.0000918,
    CHF: 0.0000578,
    KRW: 0.0892,
    CNY: 0.000464,
    THB: 0.00223,
    PHP: 0.00375,
    INR: 0.00538,
    BRL: 0.000335,
    MXN: 0.00109,
    AED: 0.000233,
    SAR: 0.000238,
    TWD: 0.00210,
    HKD: 0.000496,
    NZD: 0.000112,
    SEK: 0.000672,
    NOK: 0.000703,
    DKK: 0.000443,
    PLN: 0.000257,
    CZK: 0.00153,
    HUF: 0.0243,
    RON: 0.000298,
    BGN: 0.000116,
    TRY: 0.00204,
    RUB: 0.00586,
    UAH: 0.00260,
    VND: 1.59,
    NGN: 0.0990,
    EGP: 0.00310,
    PKR: 0.0177,
    BDT: 0.00758,
    LKR: 0.0189,
  };
  return rates[currencyCode] || 1;
}


