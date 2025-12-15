import "./globals.css";
import { Toaster } from "react-hot-toast";
import "@fortawesome/fontawesome-free/css/all.min.css";
import AuthContext from "@/context/AuthContext";
import { ThemeProvider } from "@/components/theme-provider";
import Script from "next/script";

// 系统启动现在通过 instrumentation.ts 自动初始化

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // suppressHydrationWarning 说明：
  // - 允许我们在客户端通过脚本/ThemeProvider 动态切换 <html> 上的 class（dark/light），
  // - 避免因服务端与客户端首帧 class 不一致而触发 Hydration 警告。
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
            }catch(e){}
          })();`}
        </Script>
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
