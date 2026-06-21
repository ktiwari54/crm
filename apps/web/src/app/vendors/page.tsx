'use client';

import { useFetch } from '@/hooks/useFetch';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';

type Vendor = {
  id: string;
  name: string;
  code: string;
  leadTimeDays: number;
  contactEmail: string | null;
  products: { product: { sku: string; name: string }; leadTimeDays: number; moq: string }[];
};

export default function VendorsPage() {
  const { data, loading, error, reload } = useFetch<Vendor[]>('/vendors');

  return (
    <div className="p-8">
      <PageHeader title="Vendors" description="Supplier records, lead times, and SKU sourcing" />
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} onRetry={reload} /> : null}
        {!loading && !error && data && data.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {data.map((v) => (
              <div key={v.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{v.name}</p>
                    <p className="text-sm text-slate-500">{v.code} · {v.leadTimeDays}d default lead time</p>
                  </div>
                  <Badge>{v.products.length} SKUs</Badge>
                </div>
                {v.products.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {v.products.map((vp) => (
                      <span key={vp.product.sku} className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">
                        {vp.product.sku} · {vp.leadTimeDays}d · MOQ {vp.moq}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}