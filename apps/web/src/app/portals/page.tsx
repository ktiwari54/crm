'use client';

import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { FormField, inputClass, btnPrimary } from '@/components/ui/FormField';
import { apiFetch } from '@/lib/api';

type PortalAccess = {
  id: string;
  contactEmail: string;
  accessToken: string | null;
  lastLoginAt: string | null;
  account: { id: string; name: string; accountType: string };
};

type Account = { id: string; name: string };

export default function PortalsPage() {
  const { data, loading, error, reload } = useFetch<PortalAccess[]>('/portals');
  const accounts = useFetch<Account[]>('/accounts');
  const [accountId, setAccountId] = useState('');
  const [email, setEmail] = useState('');
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);

  async function grant() {
    await apiFetch('/portals/grant', {
      method: 'POST',
      body: JSON.stringify({ accountId, contactEmail: email }),
    });
    setEmail('');
    await reload();
  }

  async function preview(accountId: string) {
    const s = await apiFetch<Record<string, unknown>>(`/portals/summary/${accountId}`);
    setSummary(s);
  }

  return (
    <div className="p-8">
      <PageHeader title="Portals" description="Customer and partner self-service portal access" />
      <div className="mb-6 grid gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-3">
        <FormField label="Account">
          <select className={inputClass} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">Select account</option>
            {accounts.data?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </FormField>
        <FormField label="Contact email">
          <input className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@partner.com" />
        </FormField>
        <div className="flex items-end">
          <button type="button" className={btnPrimary} onClick={grant} disabled={!accountId || !email}>Grant Access</button>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} onRetry={reload} /> : null}
        {!loading && !error && data && data.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3">Account</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Last Login</th>
                <th className="px-6 py-3">Portal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium">{p.account.name}</td>
                  <td className="px-6 py-4">{p.contactEmail}</td>
                  <td className="px-6 py-4"><Badge>{p.account.accountType}</Badge></td>
                  <td className="px-6 py-4 text-slate-500">{p.lastLoginAt ? new Date(p.lastLoginAt).toLocaleDateString() : 'Never'}</td>
                  <td className="px-6 py-4 space-x-3">
                    {p.accessToken ? (
                      <a
                        href={`/portal?token=${p.accessToken}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Open portal
                      </a>
                    ) : null}
                    <button type="button" className="text-sm text-slate-500 hover:underline" onClick={() => preview(p.account.id)}>Preview data</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
      {summary ? (
        <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-6">
          <p className="mb-2 font-medium text-blue-900">Portal preview</p>
          <pre className="overflow-auto text-xs text-blue-800">{JSON.stringify(summary, null, 2)}</pre>
        </div>
      ) : null}
    </div>
  );
}