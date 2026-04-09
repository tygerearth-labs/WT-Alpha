import { translations as enTranslations } from './locales/en';
import { translations as idTranslations } from './locales/id';

export type Locale = 'en' | 'id';
export type TranslationKey = string;

// Use a looser type so both EN and ID can be assigned
type TranslationMap = {
  [key: string]: string | TranslationMap;
};

export const localeMap: Record<Locale, TranslationMap> = {
  en: enTranslations as unknown as TranslationMap,
  id: idTranslations as unknown as TranslationMap,
};

/**
 * Get nested value from object using dot notation: 'kas.totalIncome'
 */
export function getNestedValue(obj: TranslationMap | undefined, path: string): string {
  if (!obj) return path;
  const keys = path.split('.');
  let current: string | TranslationMap | undefined = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current === 'string') return path;
    current = current[key];
    if (current === undefined) return path;
  }
  return typeof current === 'string' ? current : path;
}

/**
 * Replace template variables: "Hello {name}" → "Hello World"
 */
export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return Object.entries(params).reduce(
    (str, [key, val]) => str.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val)),
    template,
  );
}
