import "./globals.css";
import { Toaster } from "react-hot-toast";
import "@fortawesome/fontawesome-free/css/all.min.css";
import AuthContext from "@/context/AuthContext";
import { ThemeProvider } from "@/components/theme-provider";

// 系统启动现在通过 instrumentation.ts 自动初始化

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
            (function() {
              try {
                var STORAGE_KEY = 'coolmonitor-theme';
                var saved = localStorage.getItem(STORAGE_KEY) || 'dark';
                var isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                var resolved = saved === 'system' ? (isDark ? 'dark' : 'light') : saved;
                var root = document.documentElement;
                root.classList.remove('dark','light');
                root.classList.add(resolved);
              } catch (e) {}
            })();
          `,
          }}
        />
      </head>
      <body className="font-sans bg-light-bg dark:bg-dark-bg text-light-text-primary dark:text-dark-text-primary">
        <ThemeProvider defaultTheme="dark">
          <AuthContext>
            {children}
          </AuthContext>
          <Toaster position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
