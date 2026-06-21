'use client';

import { useFetch } from '@/hooks/useFetch';
import { formatCurrency, formatDate } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';

type EolImpact = {
  summary: {
    eolProductCount: number;
    affectedAssetCount: number;
    affectedAccountCount: number;
    openQuoteLines: number;
  };
  products: {
    id: string;
    sku: string;
    name: string;
    eolDate: string | null;
    successor: { sku: string; name: string; listPrice: string | null } | null;
    installedCount: number;
    accounts: { id: string; name: string; healthScore: string | null }[];
    openQuotes: { quoteNumber: string; account: string; status: string; quantity: string }[];
  }[];
};

export default function EolPage() {
  const { data, loading, error, reload } = useFetch<EolImpact>('/products/eol-impact');

  return (
    <div className="p-8">
      <PageHeader title="EOL Manager" description="End-of-life products, successor mapping, and account impact" />

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={reload} /> : null}

      {data ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            {[
              ['EOL Products', data.summary.eolProductCount],
              ['Installed Assets', data.summary.affectedAssetCount],
              ['Affected Accounts', data.summary.affectedAccountCount],
              ['Open Quote Lines', data.summary.openQuoteLines],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase text-slate-500">{label as string}</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{value as number}</p>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            {data.products.map((p) => (
              <div key={p.id} className="rounded-xl border border-red-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-medium">{p.sku}</p>
                      <Badge variant="red">EOL</Badge>
                    </div>
                    <p className="text-sm text-slate-600">{p.name}</p>
                    {p.eolDate ? <p className="mt-1 text-xs text-slate-400">EOL date: {formatDate(p.eolDate)}</p> : null}
                  </div>
                  {p.successor ? (
                    <div className="rounded-lg bg-emerald-50 px-4 py-2 text-right">
                      <p className="text-xs font-semibold uppercase text-emerald-600">Successor</p>
                      <p className="text-sm font-medium text-emerald-900">{p.successor.sku}</p>
                      <p className="text-xs text-emerald-700">{p.successor.name}</p>
                      {p.successor.listPrice ? <p className="text-xs text-emerald-600">{formatCurrency(p.successor.listPrice)}</p> : null}
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                      Affected Accounts ({p.installedCount} assets)
                    </p>
                    {p.accounts.length === 0 ? (
                      <p className="text-sm text-slate-400">No installed assets</p>
                    ) : (
                      <ul className="space-y-1">
                        {p.accounts.map((a) => (
                          <li key={a.id} className="text-sm">
                            {a.name}
                            {a.healthScore ? <span className="ml-2 text-xs text-slate-400">({a.healthScore})</span> : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Open Quotes</p>
                    {p.openQuotes.length === 0 ? (
                      <p className="text-sm text-slate-400">None</p>
                    ) : (
                      <ul className="space-y-1">
                        {p.openQuotes.map((q) => (
                          <li key={q.quoteNumber} className="text-sm">
                            {q.quoteNumber} · {q.account} · qty {q.quantity}
                            <Badge variant="default">{q.status}</Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {data.products.length === 0 ? (
              <p className="text-center text-sm text-slate-400">No EOL products configured</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}