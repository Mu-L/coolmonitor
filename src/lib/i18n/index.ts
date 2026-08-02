import zh from './zh';
import en from './en';

export type Locale = 'zh' | 'en';

export type LocaleMessages = typeof zh;

export const SUPPORTED_LOCALES: Locale[] = ['zh', 'en'];

export const LOCALE_LABELS: Record<Locale, string> = {
  zh: '中文',
  en: 'English',
};

export const localeMessages: Record<Locale, LocaleMessages> = {
  zh,
  en: en as unknown as LocaleMessages,
};

export const DEFAULT_LOCALE: Locale = 'zh';

export const STORAGE_KEY = 'coolmonitor-locale';

/**
 * Detect the preferred locale from browser settings.
 * Falls back to DEFAULT_LOCALE (zh) if detection fails.
 */
export function detectBrowserLocale(): Locale {
  try {
    if (typeof navigator === 'undefined') return DEFAULT_LOCALE;

    const languages = navigator.languages || [navigator.language || ''];
    for (const lang of languages) {
      if (!lang) continue;
      const lower = lang.toLowerCase();
      if (lower.startsWith('zh')) return 'zh';
      if (lower.startsWith('en')) return 'en';
    }
  } catch {
    // ignore
  }
  return DEFAULT_LOCALE;
}

/**
 * Read the stored locale from localStorage.
 * Returns null if not set or not a valid locale.
 */
export function getStoredLocale(): Locale | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (stored === 'zh' || stored === 'en')) {
      return stored;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Persist locale to localStorage.
 */
export function storeLocale(locale: Locale): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, locale);
    }
  } catch {
    // ignore
  }
}

/**
 * Resolve the effective locale by priority:
 * 1. localStorage override
 * 2. browser detection
 * 3. DEFAULT_LOCALE
 */
export function resolveInitialLocale(): Locale {
  return getStoredLocale() || detectBrowserLocale();
}

/**
 * Get a nested value from an object using a dot-notation key path.
 */
function getNestedValue(obj: Record<string, unknown>, keyPath: string): unknown {
  const parts = keyPath.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Replace {placeholder} tokens in a string with provided params.
 */
function interpolate(template: unknown, params?: Record<string, string | number>): unknown {
  if (typeof template !== 'string' || !params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const val = params[key];
    return val !== undefined ? String(val) : `{${key}}`;
  });
}

/**
 * Create a translation function for a given locale.
 * Supports dot-notation keys and {placeholder} interpolation.
 * Falls back to the key itself if not found.
 */
export function createTranslator(locale: Locale) {
  const messages = localeMessages[locale] || localeMessages[DEFAULT_LOCALE];
  const fallback = localeMessages[DEFAULT_LOCALE];

  function t(key: string, params?: Record<string, string | number>): string {
    let value = getNestedValue(messages as unknown as Record<string, unknown>, key);
    if (value === undefined) {
      value = getNestedValue(fallback as unknown as Record<string, unknown>, key);
    }
    const interpolated = interpolate(value, params);
    return typeof interpolated === 'string' ? interpolated : key;
  }

  return t;
}

/**
 * Server-side translation function for use in API routes / server components.
 * Reads locale from the user's preferredLanguage or defaults to zh.
 */
export function getServerTranslator(locale?: string | null) {
  const resolved: Locale = locale === 'en' ? 'en' : 'zh';
  return createTranslator(resolved);
}
