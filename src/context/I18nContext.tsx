"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  type Locale,
  createTranslator,
  resolveInitialLocale,
  storeLocale,
  detectBrowserLocale,
  getStoredLocale,
} from "@/lib/i18n";

type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslateFn;
  ready: boolean;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "zh",
  setLocale: () => {},
  t: (key: string) => key,
  ready: false,
});

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}

interface I18nProviderProps {
  children: React.ReactNode;
  /** Optional initial locale from server (e.g., from user's preferredLanguage) */
  initialLocale?: Locale;
}

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale || "zh");
  const [ready, setReady] = useState(false);

  // On mount: resolve the effective locale
  useEffect(() => {
    // Priority: localStorage override > user preference (backend) > browser detection > default
    const stored = getStoredLocale();
    if (stored) {
      setLocaleState(stored);
      setReady(true);
      return;
    }

    if (initialLocale) {
      setLocaleState(initialLocale);
      setReady(true);
      return;
    }

    const detected = detectBrowserLocale();
    setLocaleState(detected);
    setReady(true);

    // Best-effort: fetch user's preferred language from backend (if logged in)
    fetch("/api/user/language", { headers: { "Content-Type": "application/json" } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && data.language && !getStoredLocale()) {
          const lang = data.language === "en" ? "en" : "zh";
          setLocaleState(lang);
        }
      })
      .catch(() => {
        // ignore — not logged in or error
      });
  }, [initialLocale]);

  // Update <html lang="..."> when locale changes
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
    }
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    storeLocale(newLocale);
    // Sync to backend (best-effort, non-blocking)
    try {
      fetch("/api/user/language", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: newLocale }),
      }).catch(() => {
        // ignore errors (e.g., not logged in)
      });
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback<TranslateFn>(
    (key: string, params?: Record<string, string | number>) => {
      const translator = createTranslator(locale);
      return translator(key, params);
    },
    [locale]
  );

  const value: I18nContextValue = {
    locale,
    setLocale,
    t,
    ready,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// Re-export for convenience
export { resolveInitialLocale };
