"use client";

import { useState, useRef, useEffect } from "react";
import { useI18n } from "@/context/I18nContext";
import { SUPPORTED_LOCALES, LOCALE_LABELS } from "@/lib/i18n";

export default function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t, locale, setLocale } = useI18n();
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="bg-dark-bg text-foreground min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-8 relative">
        {/* 语言切换器：放在内容容器内，右对齐 */}
        <div className="flex justify-end mb-2" ref={langDropdownRef}>
          <div className="relative">
            <button
              className="px-3 py-1.5 rounded-button hover:bg-primary/10 transition-colors text-foreground/70 hover:text-primary flex items-center space-x-1.5 text-sm"
              onClick={() => setIsLangOpen(!isLangOpen)}
              aria-label={t('header.language')}
              title={t('header.language')}
            >
              <i className="fas fa-language"></i>
              <span>{LOCALE_LABELS[locale]}</span>
              <i className={`fas fa-chevron-down text-xs transition-transform ${isLangOpen ? 'rotate-180' : ''}`}></i>
            </button>
            {isLangOpen && (
              <div className="absolute right-0 mt-2 w-32 rounded-lg shadow-2xl bg-dark-nav border-2 border-primary/25 z-[999] overflow-hidden animate-fadeIn">
                {SUPPORTED_LOCALES.map((l) => (
                  <button
                    key={l}
                    className={`w-full text-left px-4 py-2.5 hover:bg-primary/10 text-sm flex items-center justify-between transition-colors ${
                      locale === l ? 'text-primary font-medium bg-primary/5' : 'text-foreground/80'
                    }`}
                    onClick={() => {
                      setLocale(l);
                      setIsLangOpen(false);
                    }}
                  >
                    <span>{LOCALE_LABELS[l]}</span>
                    {locale === l && <i className="fas fa-check text-xs"></i>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
