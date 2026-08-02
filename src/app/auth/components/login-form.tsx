'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useI18n } from '@/context/I18nContext';

export default function LoginForm() {
  const { t } = useI18n();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // 注意：这里仅展示UI，实际锁定逻辑应由后端实现
  // 后端应记录用户登录失败次数和锁定状态

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!login || !password) {
      setError(t('auth.fillAllFields'));
      setLoading(false);
      return;
    }

    try {
      
      // 实际应用中，应该在signIn前检查用户是否已被锁定
      // 例如: const lockStatus = await checkUserLockStatus(login);
      // if (lockStatus.isLocked) { setError(`账户已被锁定，请${lockStatus.remainingTime}后重试`); setLoading(false); return; }
      
      // 调用NextAuth的signIn方法进行登录
      const result = await signIn('credentials', {
        redirect: false, // 不自动重定向
        login, // 用户名或邮箱
        password,
        callbackUrl: '/dashboard' // 设置回调URL
      });


      if (result?.error) {
        // 后端应在验证失败时增加失败计数
        // 例如: await incrementFailedAttempt(login);
        // 并在达到阈值时锁定账户
        
        setError(t('auth.invalidCredentials'));
        setLoading(false);
        return;
      }

      // 登录成功，后端应重置失败计数
      // 例如: await resetFailedAttempts(login);
      
      // 登录成功后，使用全页面导航而不是客户端路由
      // 这样可以确保下一个页面加载时会包含完整的会话状态
      console.log('登录成功，正在跳转到仪表盘...');
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('登录错误', error);
      setError(t('auth.loginError'));
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <form onSubmit={handleSubmit} className="bg-card p-8 rounded-xl shadow-lg border border-purple-600/15">
        <h2 className="text-2xl font-bold text-center mb-6 text-primary">{t('auth.welcomeBack')}</h2>
        <p className="text-center mb-6 text-foreground text-sm">{t('auth.loginToAccount')}</p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-500 text-sm">
            {error}
          </div>
        )}
        
        <div className="mb-4">
          <label htmlFor="login" className="block mb-2 text-sm font-medium text-foreground">
            {t('auth.accountOrEmail')}
          </label>
          <input
            id="login"
            type="text"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            className="w-full p-3 text-white bg-dark-nav border border-purple-600/30 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600/50 focus:border-purple-600"
            required
          />
        </div>
        
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              {t('auth.password')}
            </label>
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
            >
              {t('auth.forgotPassword')}
            </button>
          </div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
              <i className="fas fa-circle-notch fa-spin mr-2"></i> {t('auth.loggingIn')}
            </span>
          ) : (
            t('auth.login')
          )}
        </button>
      </form>

      {/* 密码重置提示弹窗 */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setShowForgotPassword(false)}>
          <div className="bg-card rounded-xl shadow-2xl border border-purple-600/30 max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-purple-300">
                <i className="fas fa-info-circle mr-2"></i>
                {t('auth.howToReset')}
              </h3>
              <button
                onClick={() => setShowForgotPassword(false)}
                className="text-foreground hover:text-purple-300 transition-colors"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="mb-4">
              <p className="text-purple-300 font-medium mb-2">{t('auth.dockerMethod')}</p>
              <p className="text-foreground mb-2 text-sm">{t('auth.dockerHostHint')}</p>
              <div className="bg-dark-nav p-3 rounded-md border border-purple-600/20 text-xs font-mono mb-2">
                <p className="text-green-400">docker exec -it coolmonitor node scripts/reset-password.js 用户名 "新密码123" </p>
              </div>
              <p className="text-foreground mb-1 text-sm">{t('auth.dockerContainerHint')}</p>
              <div className="bg-dark-nav p-3 rounded-md border border-purple-600/20 text-xs font-mono">
                <p className="text-green-400">node scripts/reset-password.js 用户名 "新密码123"</p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-purple-300 font-medium mb-2">{t('auth.npmMethod')}</p>
              <div className="bg-dark-nav p-3 rounded-md border border-purple-600/20 text-xs font-mono">
                <p className="text-green-400">node scripts/reset-password.js 用户名 "新密码123"</p>
              </div>
            </div>

            <div className="text-xs text-foreground mb-4">
              {t('auth.resetHint')}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowForgotPassword(false)}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
