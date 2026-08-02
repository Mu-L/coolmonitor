import "./globals.css";
import { Toaster } from "react-hot-toast";
import "@fortawesome/fontawesome-free/css/all.min.css";
import AuthContext from "@/context/AuthContext";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/context/I18nContext";
import Script from "next/script";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){
            try{
              var KEY = 'coolmonitor-theme';
              var saved = localStorage.getItem(KEY);
              var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
              var useDark = (saved === 'dark') || (saved === 'system' ? prefersDark : (saved ? saved === 'dark' : true));
              var root = document.documentElement;
              root.classList.remove('dark','light');
              root.classList.add(useDark ? 'dark' : 'light');

              var LANG_KEY = 'coolmonitor-locale';
              var savedLang = localStorage.getItem(LANG_KEY);
              var detectedLang = 'zh';
              try {
                var langs = navigator.languages || [navigator.language || ''];
                for (var i = 0; i < langs.length; i++) {
                  var l = (langs[i] || '').toLowerCase();
                  if (l.indexOf('en') === 0) { detectedLang = 'en'; break; }
                  if (l.indexOf('zh') === 0) { detectedLang = 'zh'; break; }
                }
              } catch(e) {}
              var useLang = savedLang || detectedLang;
              root.lang = useLang === 'en' ? 'en' : 'zh-CN';
            }catch(e){}
          })();`}
        </Script>
      </head>
      <body className="font-sans bg-light-bg dark:bg-dark-bg text-light-text-primary dark:text-dark-text-primary">
        <ThemeProvider defaultTheme="dark">
          <I18nProvider>
            <AuthContext>
              {children}
            </AuthContext>
          </I18nProvider>
          <Toaster position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
