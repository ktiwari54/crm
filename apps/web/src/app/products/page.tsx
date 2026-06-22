'use client';

import { useMemo, useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { formatCurrency, formatNumber } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { CsvImportModal, SAMPLE_PRODUCTS_CSV } from '@/components/CsvImportModal';
import { btnSecondary } from '@/components/ui/FormField';

type Product = {
  id: string;
  sku: string;
  name: string;
  manufacturer: string | null;
  condition: string | null;
  listPrice: string | null;
  isEol: boolean;
  category: { name: string } | null;
  inventoryLevels: {
    atp: string;
    onHand: string;
    warehouse: { code: string; name: string };
  }[];
};

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [showImport, setShowImport] = useState(false);
  const path = useMemo(
    () => (search ? `/products?search=${encodeURIComponent(search)}` : '/products'),
    [search],
  );
  const { data, loading, error, reload } = useFetch<Product[]>(path, [search]);

  function totalAtp(product: Product) {
    return product.inventoryLevels.reduce((sum, l) => sum + Number(l.atp), 0);
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Products"
        description="Catalog with live ERP inventory — ATP by warehouse"
        action={
          <button type="button" className={btnSecondary} onClick={() => setShowImport(true)}>Import CSV</button>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by SKU, name, or MPN..."
            className="w-full max-w-md rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {loading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} onRetry={reload} /> : null}
        {!loading && !error && data?.length === 0 ? <EmptyState title="No products found" /> : null}

        {!loading && !error && data && data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3">SKU</th>
                  <th className="px-6 py-3">Product</th>
                  <th className="px-6 py-3">Condition</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">List Price</th>
                  <th className="px-6 py-3">ATP</th>
                  <th className="px-6 py-3">Warehouses</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((product) => {
                  const atp = totalAtp(product);
                  return (
                    <tr key={product.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-mono text-xs text-slate-700">{product.sku}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{product.name}</span>
                          {product.isEol ? <Badge variant="red">EOL</Badge> : null}
                        </div>
                        {product.manufacturer ? (
                          <p className="text-xs text-slate-500">{product.manufacturer}</p>
                        ) : null}
                      </td>
                      <td className="px-6 py-4">{product.condition ? <Badge variant="blue">{product.condition}</Badge> : <span className="text-slate-400">—</span>}</td>
                      <td className="px-6 py-4 text-slate-600">{product.category?.name ?? '—'}</td>
                      <td className="px-6 py-4 text-slate-900">{formatCurrency(product.listPrice)}</td>
                      <td className="px-6 py-4">
                        <Badge variant={atp <= 10 ? 'red' : atp <= 50 ? 'yellow' : 'green'}>
                          {formatNumber(atp)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {product.inventoryLevels.map((l) => (
                          <div key={l.warehouse.code}>
                            {l.warehouse.code}: {formatNumber(l.atp)} ATP
                          </div>
                        ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {showImport ? (
        <CsvImportModal
          endpoint="/products/import"
          title="Import Products from CSV"
          hint="Header row required. Columns: Product Name (required), Part Number, Condition, Product Category, Record Id, and optionally List Price, Cost Price, Stock. Re-importing the same Record Id updates the product."
          sampleCsv={SAMPLE_PRODUCTS_CSV}
          sampleName="products-sample.csv"
          onClose={() => setShowImport(false)}
          onDone={() => { setShowImport(false); void reload(); }}
        />
      ) : null}
    </div>
  );
}