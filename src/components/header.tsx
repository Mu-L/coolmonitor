"use client";

import { useState, useRef, useEffect } from "react";
import { useTheme } from "@/components/theme-provider";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { SettingsDialog } from "./settings-dialog";
import { useI18n } from "@/context/I18nContext";
import { SUPPORTED_LOCALES, LOCALE_LABELS } from "@/lib/i18n";
import Link from "next/link";

export function Header() {
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProductsOpen, setIsProductsOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const productsDropdownRef = useRef<HTMLDivElement>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  const recommendedProducts = [
    { title: "ShowDoc", url: "https://www.showdoc.com.cn/", description: t('header.products.showdoc'), icon: "book" },
    { title: "RunApi", url: "https://www.runapi.com.cn/", description: t('header.products.runapi'), icon: "code" },
    { title: locale === 'zh' ? "大风云" : "DafengYun", url: "https://www.dfyun.com.cn/", description: t('header.products.dafengyun'), icon: "cloud" },
    { title: "Push", url: "https://push.showdoc.com.cn/", description: t('header.products.push'), icon: "bell" },
    { title: locale === 'zh' ? "极速箱" : "JisuXiang", url: "https://www.jisuxiang.com/", description: t('header.products.jisuxiang'), icon: "bell" }
  ];

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });
      router.push("/auth/login");
      router.refresh();
    } catch (error) {
      console.error(t('header.logoutFailed'), error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (productsDropdownRef.current && !productsDropdownRef.current.contains(event.target as Node)) {
        setIsProductsOpen(false);
      }
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
  };

  const handleSettingsCloseWithRefresh = () => {
    setIsSettingsOpen(false);
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  return (
    <>
      <nav className="glass-effect fixed top-0 left-80 right-0 h-16 border-b border-primary/10 z-50">
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-xl font-bold text-primary">{t('common.appName')}</span>
            <span className="dark:text-white/80 text-light-text-secondary">{t('common.tagline')}</span>
          </div>
          <div className="flex items-center space-x-4">
            <button
              className="p-2 rounded-button hover:bg-primary/10 transition-colors dark:text-white text-light-text-primary"
              onClick={toggleTheme}
              aria-label={t('header.toggleTheme')}
            >
              <i className="fas fa-lightbulb"></i>
            </button>

            {/* Language switcher */}
            <div className="relative" ref={langDropdownRef}>
              <button
                className="p-2 rounded-button hover:bg-primary/10 transition-colors dark:text-white text-light-text-primary flex items-center space-x-1"
                onClick={() => setIsLangOpen(!isLangOpen)}
                aria-label={t('header.language')}
                title={t('header.language')}
              >
                <i className="fas fa-language"></i>
                <span className="text-xs">{LOCALE_LABELS[locale]}</span>
              </button>
              {isLangOpen && (
                <div className="absolute right-0 mt-2 w-32 rounded-lg shadow-2xl dark:bg-dark-nav bg-light-nav border-2 border-primary/25 z-[999] overflow-hidden animate-fadeIn">
                  {SUPPORTED_LOCALES.map((l) => (
                    <button
                      key={l}
                      className={`w-full text-left px-4 py-2.5 hover:bg-primary/10 text-sm flex items-center justify-between transition-colors ${
                        locale === l ? 'text-primary font-medium bg-primary/5' : 'dark:text-white text-light-text-primary'
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

            <button
              className="p-2 rounded-button hover:bg-primary/10 transition-colors dark:text-white text-light-text-primary"
              onClick={() => router.push('/dashboard/status-pages')}
              aria-label={t('header.statusPageManage')}
            >
              <i className="fas fa-chart-line"></i>
            </button>

            <button
              className="p-2 rounded-button hover:bg-primary/10 transition-colors dark:text-white text-light-text-primary"
              onClick={() => setIsSettingsOpen(true)}
              aria-label={t('header.settings')}
            >
              <i className="fas fa-cog"></i>
            </button>

            {/* GitHub */}
            <Link
              href="https://github.com/star7th/coolmonitor"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-button hover:bg-primary/10 transition-colors dark:text-white text-light-text-primary"
              aria-label={t('header.githubRepo')}
            >
              <i className="fab fa-github"></i>
            </Link>

            {/* Products dropdown */}
            <div className="relative" ref={productsDropdownRef}>
              <button
                className="p-2 rounded-button hover:bg-primary/10 transition-colors dark:text-white text-light-text-primary"
                onClick={() => setIsProductsOpen(!isProductsOpen)}
                aria-label={t('header.moreProducts')}
              >
                <i className="fas fa-th-large"></i>
              </button>

              {isProductsOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-lg shadow-2xl dark:bg-dark-nav bg-light-nav border-2 border-primary/25 z-[999] overflow-hidden animate-fadeIn">
                  <div className="p-4 border-b border-primary/10 dark:bg-dark-card bg-light-card">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium dark:text-white text-light-text-primary">{t('header.moreProducts')}</p>
                    </div>
                  </div>

                  <div className="py-2 max-h-80 overflow-y-auto">
                    {recommendedProducts.map((product, index) => (
                      <Link
                        key={index}
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full text-left px-4 py-3 hover:bg-primary/10 text-sm flex items-start space-x-3 dark:text-white text-light-text-primary transition-colors"
                      >
                        <div className="mt-0.5">
                          <i className={`fas fa-${product.icon} w-5 text-primary`}></i>
                        </div>
                        <div>
                          <div className="font-medium">{product.title}</div>
                          <div className="text-xs dark:text-white/60 text-light-text-secondary mt-0.5">{product.description}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                className="flex items-center space-x-2 p-2 rounded-button hover:bg-primary/10 transition-colors dark:text-white text-light-text-primary"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <i className="fas fa-user"></i>
                {session?.user?.email && (
                  <span className="text-sm hidden md:inline-block">{session.user.email}</span>
                )}
                <i className="fas fa-chevron-down text-xs"></i>
              </button>

              {isDropdownOpen && (
                <div ref={dropdownRef} className="absolute right-0 mt-2 w-64 rounded-lg shadow-2xl dark:bg-dark-nav bg-light-nav border-2 border-primary/25 z-[999] overflow-hidden animate-fadeIn">
                  <div className="p-4 border-b border-primary/10 dark:bg-dark-card bg-light-card">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                        <i className="fas fa-user"></i>
                      </div>
                      <div>
                        <p className="text-sm font-medium dark:text-white text-light-text-primary">{session?.user?.name || t('header.user')}</p>
                        <p className="text-xs dark:text-white/60 text-light-text-secondary">{session?.user?.email || ''}</p>
                      </div>
                    </div>
                  </div>

                  <div className="py-2">
                    <button
                      className="w-full text-left px-4 py-2 hover:bg-primary/10 text-sm flex items-center space-x-2 dark:text-white text-light-text-primary transition-colors"
                      onClick={() => {
                        router.push('/dashboard/login-records');
                        setIsDropdownOpen(false);
                      }}
                    >
                      <i className="fas fa-history w-5"></i>
                      <span>{t('header.loginRecords')}</span>
                    </button>

                    <button
                      className="w-full text-left px-4 py-2 rounded-md hover:bg-red-500/10 text-sm flex items-center space-x-2 text-red-400 transition-colors"
                      onClick={handleLogout}
                    >
                      <i className="fas fa-sign-out-alt w-5"></i>
                      <span>{t('header.logout')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <SettingsDialog isOpen={isSettingsOpen} onClose={handleSettingsClose} onRefresh={handleSettingsCloseWithRefresh} />
    </>
  );
}
