'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';

export default function LoginPage() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const autoLoginAttempted = useRef(false);
  const [email, setEmail] = useState('admin@crm.local');
  const [password, setPassword] = useState('Admin123!');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitLogin() {
    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    if (searchParams.get('auto') !== '1' || autoLoginAttempted.current) return;
    autoLoginAttempted.current = true;
    void submitLogin();
  }, [searchParams]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await submitLogin();
  }

  async function handleSso() {
    setError('');
    setIsSubmitting(true);
    try {
      const sso = await apiFetch<{ authorizationUrl: string; stubMode: boolean }>(
        '/auth/sso/login',
      );
      if (sso.stubMode) {
        window.location.href = '/login/sso-callback?code=azure-demo-code';
      } else {
        window.location.href = sso.authorizationUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SSO login failed');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">CRM</h1>
          <p className="mt-1 text-sm text-slate-400">B2B Electronics Distribution</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-slate-300"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-slate-300"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {error ? (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-600" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-slate-800 px-2 text-slate-400">or</span>
          </div>
        </div>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => void handleSso()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="text-base">🔷</span>
          Sign in with Microsoft
        </button>
        <p className="mt-2 text-center text-xs text-slate-500">
          Demo mode uses Azure AD stub — no real tenant required
        </p>
      </div>
    </div>
  );
}