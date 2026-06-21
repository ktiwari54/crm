'use client';

import { useFetch } from '@/hooks/useFetch';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { formatNumber } from '@/lib/format';

type Rate = {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: string;
  effectiveAt: string;
};

export default function CurrenciesPage() {
  const supported = useFetch<string[]>('/currencies');
  const rates = useFetch<Rate[]>('/currencies/rates');
  const sample = useFetch<{ amount: number; from: string; to: string; rate: number }>(
    '/currencies/convert?amount=10000&from=USD&to=EUR',
  );

  const loading = supported.loading || rates.loading;
  const error = supported.error || rates.error;

  return (
    <div className="p-8">
      <PageHeader
        title="Multi-Currency"
        description="Exchange rates for international accounts and quotes"
      />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={() => { void supported.reload(); void rates.reload(); }} /> : null}
      {!loading && !error ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold uppercase text-slate-500">Supported Currencies</h3>
            <div className="flex flex-wrap gap-2">
              {supported.data?.map((c) => (
                <span key={c} className="rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700">{c}</span>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold uppercase text-slate-500">Sample Conversion</h3>
            {sample.data ? (
              <p className="text-sm text-slate-700">
                {formatNumber(10000)} USD = {formatNumber(sample.data.amount)} EUR
                <span className="ml-2 text-slate-400">(rate: {sample.data.rate.toFixed(4)})</span>
              </p>
            ) : null}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <h3 className="mb-3 text-sm font-semibold uppercase text-slate-500">Exchange Rates</h3>
            <table className="w-full text-left text-sm">
              <thead className="border-b text-xs uppercase text-slate-500">
                <tr>
                  <th className="pb-2">From</th>
                  <th className="pb-2">To</th>
                  <th className="pb-2">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rates.data?.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 font-medium">{r.fromCurrency}</td>
                    <td className="py-2">{r.toCurrency}</td>
                    <td className="py-2">{Number(r.rate).toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}