'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import type { AuthUser } from '@/lib/auth';

type SsoCallbackResponse = {
  accessToken: string;
  user: AuthUser;
};

export default function SsoCallbackPage() {
  const { loginWithToken } = useAuth();
  const searchParams = useSearchParams();
  const attempted = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    const code = searchParams.get('code');
    if (!code) {
      setError('Missing authorization code from identity provider.');
      return;
    }

    void (async () => {
      try {
        const data = await apiFetch<SsoCallbackResponse>('/auth/sso/callback', {
          method: 'POST',
          body: JSON.stringify({ code }),
        });
        loginWithToken(data.accessToken, data.user);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'SSO sign-in failed');
      }
    })();
  }, [searchParams, loginWithToken]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-800 p-8 text-center shadow-xl">
          <h1 className="text-xl font-bold text-white">SSO Sign-in Failed</h1>
          <p className="mt-3 text-sm text-red-400">{error}</p>
          <a
            href="/login"
            className="mt-6 inline-block text-sm text-blue-400 hover:text-blue-300"
          >
            Back to login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900">
      <p className="text-sm text-slate-400">Completing sign-in with Microsoft...</p>
    </div>
  );
}