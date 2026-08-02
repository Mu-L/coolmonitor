'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useI18n } from '@/context/I18nContext';

export default function SetupForm() {
  const { t } = useI18n();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 验证表单
    if (!username || !password || !confirmPassword) {
      setError(t('auth.fillRequired'));
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError(t('auth.passwordTooShort'));
      setLoading(false);
      return;
    }

    try {
      console.log("开始初始化系统...");
      // 调用注册API
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t('auth.initFailed'));
      }

      console.log("初始化成功，正在登录...");
      // 初始化成功后自动登录
      const result = await signIn('credentials', {
        redirect: false, // 不自动重定向
        login: username,
        password,
        callbackUrl: '/dashboard'
      });

      console.log("登录结果:", result);

      if (result?.error) {
        setError(t('auth.autoLoginFailed'));
        setLoading(false);
        return;
      }

      // 登录成功，使用全页面导航而不是客户端路由
      // 这确保了会话状态会被正确应用到下一个页面
      console.log("登录成功，跳转到仪表盘");
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t('auth.initError'));
      }
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center max-w-4xl mx-auto">
      <div className="w-full bg-card p-8 rounded-xl shadow-lg border border-purple-600/15">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative h-24 w-24">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full opacity-20 animate-pulse"></div>
              <div className="absolute inset-2 bg-dark-bg rounded-full flex items-center justify-center">
                <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">CM</span>
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-primary">{t('auth.welcomeToCool')}</h1>
          <p className="text-xl text-foreground mt-2">{t('auth.systemInit')}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="bg-dark-nav/30 p-4 rounded-lg border border-purple-600/10">
              <h3 className="text-lg font-medium text-primary mb-2">{t('auth.features')}</h3>
              <ul className="space-y-2 text-sm text-foreground/80">
                <li className="flex items-center">
                  <span className="inline-block w-5 h-5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full mr-2 flex-shrink-0"></span>
                  <span>{t('auth.feature1')}</span>
                </li>
                <li className="flex items-center">
                  <span className="inline-block w-5 h-5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full mr-2 flex-shrink-0"></span>
                  <span>{t('auth.feature2')}</span>
                </li>
                <li className="flex items-center">
                  <span className="inline-block w-5 h-5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full mr-2 flex-shrink-0"></span>
                  <span>{t('auth.feature3')}</span>
                </li>
                <li className="flex items-center">
                  <span className="inline-block w-5 h-5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full mr-2 flex-shrink-0"></span>
                  <span>{t('auth.feature4')}</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-dark-nav/30 p-4 rounded-lg border border-purple-600/10">
              <h3 className="text-lg font-medium text-primary mb-2">{t('auth.systemRequirements')}</h3>
              <p className="text-sm text-foreground/80">
                {t('auth.systemRequirementsDesc')}
              </p>
            </div>
          </div>
          
          <div>
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-500 text-sm">
                  {error}
                </div>
              )}
              
              <div className="mb-4">
                <label htmlFor="username" className="block mb-2 text-sm font-medium text-foreground">
                  {t('auth.adminAccount')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-3 text-white bg-dark-nav border border-purple-600/30 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600/50 focus:border-purple-600"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="password" className="block mb-2 text-sm font-medium text-foreground">
                  {t('auth.password')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 text-white bg-dark-nav border border-purple-600/30 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600/50 focus:border-purple-600"
                  required
                />
              </div>
              
              <div className="mb-6">
                <label htmlFor="confirmPassword" className="block mb-2 text-sm font-medium text-foreground">
                  {t('auth.confirmPassword')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-3 text-white bg-dark-nav border border-purple-600/30 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600/50 focus:border-purple-600"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-md hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all disabled:opacity-70"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <i className="fas fa-circle-notch fa-spin mr-2"></i> {t('auth.initializing')}
                  </span>
                ) : (
                  t('auth.startUsing')
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
      
      <div className="text-center mt-6 text-foreground/60 text-sm">
        <p>{t('auth.footer')}</p>
      </div>
    </div>
  );
} 