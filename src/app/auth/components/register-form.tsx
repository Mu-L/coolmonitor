'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useI18n } from '@/context/I18nContext';

interface RegisterFormProps {
  isAdminSetup?: boolean;
}

export default function RegisterForm({ isAdminSetup = true }: RegisterFormProps) {
  const { t } = useI18n();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

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
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t('auth.registerFailed'));
      }

      const result = await signIn('credentials', {
        redirect: false,
        login: username,
        password,
      });

      if (result?.error) {
        setError(t('auth.autoLoginFailed'));
        setLoading(false);
        return;
      }

      router.push('/dashboard');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t('auth.registerError'));
      }
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <form onSubmit={handleSubmit} className="bg-card p-8 rounded-xl shadow-lg border border-purple-600/15">
        <h2 className="text-2xl font-bold text-center mb-6 text-primary">
          {isAdminSetup ? t('auth.createAdminAccount') : t('auth.createNewAccount')}
        </h2>
        {isAdminSetup && (
          <p className="text-center mb-6 text-foreground text-sm">{t('auth.firstUserHint')}</p>
        )}
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-500 text-sm">
            {error}
          </div>
        )}
        
        <div className="mb-4">
          <label htmlFor="username" className="block mb-2 text-sm font-medium text-foreground">
            {t('auth.accountName')} <span className="text-red-500">*</span>
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-3 text-white bg-dark-nav border border-purple-600/30 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600/50 focus:border-purple-600 z-10"
            required
            style={{ zIndex: 10 }}
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
            className="w-full p-3 text-white bg-dark-nav border border-purple-600/30 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600/50 focus:border-purple-600 z-10"
            required
            style={{ zIndex: 10 }}
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
            className="w-full p-3 text-white bg-dark-nav border border-purple-600/30 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600/50 focus:border-purple-600 z-10"
            required
            style={{ zIndex: 10 }}
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-md hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all disabled:opacity-70 z-10"
          style={{ zIndex: 10 }}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <i className="fas fa-circle-notch fa-spin mr-2"></i> {t('auth.registering')}
            </span>
          ) : (
            isAdminSetup ? t('auth.createAdminAccount') : t('auth.register')
          )}
        </button>
      </form>
    </div>
  );
} 