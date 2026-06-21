'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { publicApiFetch } from '@/lib/publicApi';
import { formatCurrency } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { FormField, inputClass, btnPrimary } from '@/components/ui/FormField';

type PortalData = {
  contactEmail: string;
  account: { id: string; name: string; accountType: string };
  quotes: { id: string; quoteNumber: string; status: string; total: number }[];
  orders: { id: string; orderNumber: string; status: string; total: number }[];
  invoices: { id: string; invoiceNumber: string; status: string; total: number }[];
  cases: { id: string; caseNumber: string; subject: string; status: string }[];
};

function PortalContent() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState(searchParams.get('token') ?? '');
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadPortal(accessToken: string) {
    setLoading(true);
    setError(null);
    try {
      const result = await publicApiFetch<PortalData>('/portal/me', {}, accessToken);
      setData(result);
      if (typeof window !== 'undefined') {
        localStorage.setItem('portal_token', accessToken);
      }
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : 'Failed to load portal');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('portal_token') : null;
    const initial = searchParams.get('token') ?? stored ?? '';
    if (initial) {
      setToken(initial);
      void loadPortal(initial);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-8 py-5">
        <h1 className="text-xl font-bold text-slate-900">Partner & Customer Portal</h1>
        <p className="text-sm text-slate-500">View quotes, orders, invoices, and support cases</p>
      </header>

      <main className="mx-auto max-w-5xl p-8">
        {!data ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="mb-4 text-sm text-slate-600">Enter your portal access token to continue.</p>
            <div className="flex gap-3">
              <div className="flex-1">
                <FormField label="Access token">
                  <input
                    className={inputClass}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="demo-portal-token-brightwave"
                  />
                </FormField>
              </div>
              <div className="flex items-end">
                <button type="button" className={btnPrimary} onClick={() => loadPortal(token)} disabled={!token || loading}>
                  {loading ? 'Loading...' : 'Enter Portal'}
                </button>
              </div>
            </div>
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            <p className="mt-4 text-xs text-slate-400">Demo token: demo-portal-token-brightwave</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold">{data.account.name}</p>
                  <p className="text-sm text-slate-500">{data.contactEmail}</p>
                </div>
                <Badge>{data.account.accountType}</Badge>
              </div>
            </div>

            {[
              ['Quotes', data.quotes, (q: PortalData['quotes'][0]) => [q.quoteNumber, q.status, formatCurrency(q.total)]],
              ['Orders', data.orders, (o: PortalData['orders'][0]) => [o.orderNumber, o.status, formatCurrency(o.total)]],
              ['Invoices', data.invoices, (i: PortalData['invoices'][0]) => [i.invoiceNumber, i.status, formatCurrency(i.total)]],
              ['Cases', data.cases, (c: PortalData['cases'][0]) => [c.caseNumber, c.status, c.subject]],
            ].map(([title, items, rowFn]) => (
              <div key={title as string} className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <p className="border-b border-slate-100 px-6 py-3 font-semibold text-slate-800">{title as string}</p>
                {(items as unknown[]).length === 0 ? (
                  <p className="px-6 py-4 text-sm text-slate-400">No records</p>
                ) : (
                  <table className="w-full text-left text-sm">
                    <tbody className="divide-y divide-slate-100">
                      {(items as unknown[]).map((item) => {
                        const [col1, col2, col3] = (rowFn as (x: never) => string[])(item as never);
                        return (
                          <tr key={(item as { id: string }).id} className="hover:bg-slate-50">
                            <td className="px-6 py-3 font-medium">{col1}</td>
                            <td className="px-6 py-3"><Badge>{col2}</Badge></td>
                            <td className="px-6 py-3 text-slate-600">{col3}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            ))}

            <p className="text-center text-sm text-slate-500">
              Need help? <a href="/support" className="text-blue-600 hover:underline">Submit a support case</a>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function PortalPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-slate-500">Loading...</div>}>
      <PortalContent />
    </Suspense>
  );
}