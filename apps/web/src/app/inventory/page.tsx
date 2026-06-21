'use client';

import { useMemo, useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { apiFetch } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { FormField, inputClass, selectClass, btnPrimary, btnSecondary } from '@/components/ui/FormField';

type Level = {
  atp: string;
  onHand: string;
  allocated: string;
  reorderPoint: string;
  warehouse: { id: string; code: string; name: string };
};

type Product = {
  id: string;
  sku: string;
  name: string;
  inventoryLevels: Level[];
};

type LowStock = {
  productId: string;
  warehouseId: string;
  sku: string;
  name: string;
  warehouse: string;
  onHand: number;
  reorderPoint: number;
  suggestedOrderQty: number;
};

type Movement = {
  id: string;
  type: string;
  quantity: string;
  balanceAfter: string;
  reason: string | null;
  reference: string | null;
  createdAt: string;
  warehouse: { code: string };
  user: { firstName: string; lastName: string } | null;
};

const MOVEMENT_TYPES = [
  'receipt',
  'shipment',
  'adjustment',
  'reservation',
  'release',
  'return',
];

export default function InventoryPage() {
  const [search, setSearch] = useState('');
  const path = useMemo(
    () => (search ? `/products?search=${encodeURIComponent(search)}` : '/products'),
    [search],
  );
  const products = useFetch<Product[]>(path, [search]);
  const lowStock = useFetch<LowStock[]>('/inventory/low-stock');

  const [adjust, setAdjust] = useState<{ product: Product; level: Level } | null>(null);
  const [history, setHistory] = useState<Product | null>(null);

  function reloadAll() {
    void products.reload();
    void lowStock.reload();
  }

  return (
    <div className="p-8">
      <PageHeader title="Inventory" description="Stock levels, reorder alerts, and movement ledger" />

      {lowStock.data && lowStock.data.length > 0 ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="mb-2 text-sm font-semibold text-amber-900">
            ⚠️ {lowStock.data.length} item(s) at or below reorder point
          </p>
          <div className="flex flex-wrap gap-2">
            {lowStock.data.map((l) => (
              <span key={`${l.productId}-${l.warehouseId}`} className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs text-slate-700">
                <span className="font-mono">{l.sku}</span> · {l.warehouse} · on-hand {formatNumber(l.onHand)} / reorder {formatNumber(l.reorderPoint)} ·{' '}
                <span className="font-medium text-amber-800">order {formatNumber(l.suggestedOrderQty)}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

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

        {products.loading ? <LoadingState /> : null}
        {products.error ? <ErrorState message={products.error} onRetry={products.reload} /> : null}
        {!products.loading && !products.error && products.data?.length === 0 ? (
          <EmptyState title="No products found" />
        ) : null}

        {!products.loading && !products.error && products.data && products.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3">SKU</th>
                  <th className="px-6 py-3">Product</th>
                  <th className="px-6 py-3">Warehouse</th>
                  <th className="px-6 py-3 text-right">On Hand</th>
                  <th className="px-6 py-3 text-right">Allocated</th>
                  <th className="px-6 py-3 text-right">ATP</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.data.flatMap((product) =>
                  (product.inventoryLevels.length > 0
                    ? product.inventoryLevels
                    : [null]
                  ).map((level, idx) => (
                    <tr key={`${product.id}-${idx}`} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-mono text-xs text-slate-700">{idx === 0 ? product.sku : ''}</td>
                      <td className="px-6 py-4">{idx === 0 ? <span className="font-medium text-slate-900">{product.name}</span> : ''}</td>
                      {level ? (
                        <>
                          <td className="px-6 py-4 text-slate-600">{level.warehouse.code}</td>
                          <td className="px-6 py-4 text-right">{formatNumber(level.onHand)}</td>
                          <td className="px-6 py-4 text-right text-slate-500">{formatNumber(level.allocated)}</td>
                          <td className="px-6 py-4 text-right">
                            <Badge variant={Number(level.atp) <= Number(level.reorderPoint) ? 'red' : Number(level.atp) <= 50 ? 'yellow' : 'green'}>
                              {formatNumber(level.atp)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button type="button" className="text-xs font-medium text-blue-600 hover:underline" onClick={() => setAdjust({ product, level })}>
                              Adjust
                            </button>
                            <button type="button" className="ml-3 text-xs font-medium text-slate-500 hover:underline" onClick={() => setHistory(product)}>
                              History
                            </button>
                          </td>
                        </>
                      ) : (
                        <td className="px-6 py-4 text-slate-400" colSpan={5}>No stock record</td>
                      )}
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {adjust ? (
        <AdjustModal
          product={adjust.product}
          level={adjust.level}
          onClose={() => setAdjust(null)}
          onSaved={() => {
            setAdjust(null);
            reloadAll();
          }}
        />
      ) : null}

      {history ? <HistoryModal product={history} onClose={() => setHistory(null)} /> : null}
    </div>
  );
}

function AdjustModal({
  product,
  level,
  onClose,
  onSaved,
}: {
  product: Product;
  level: Level;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState('receipt');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    setError('');
    try {
      await apiFetch('/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({
          productId: product.id,
          warehouseId: level.warehouse.id,
          type,
          quantity: Number(quantity),
          reason: reason || undefined,
          reference: reference || undefined,
        }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to adjust stock');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title={`Adjust stock — ${product.sku} @ ${level.warehouse.code}`} onClose={onClose}>
      <div className="space-y-4">
        <FormField label="Movement type">
          <select className={selectClass} value={type} onChange={(e) => setType(e.target.value)}>
            {MOVEMENT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </FormField>
        <FormField label={type === 'adjustment' ? 'Quantity (signed delta)' : 'Quantity'}>
          <input type="number" className={inputClass} value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g. 50" />
        </FormField>
        <FormField label="Reason">
          <input className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Cycle count correction" />
        </FormField>
        <FormField label="Reference">
          <input className={inputClass} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. PO-2026-0099" />
        </FormField>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={onClose}>Cancel</button>
          <button type="button" className={btnPrimary} onClick={submit} disabled={saving || !quantity}>
            {saving ? 'Saving…' : 'Apply'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function HistoryModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const { data, loading, error } = useFetch<Movement[]>(`/inventory/${product.id}/movements`);
  return (
    <Modal open title={`Movement history — ${product.sku}`} onClose={onClose}>
      {loading ? <LoadingState /> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {data && data.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">No movements recorded.</p> : null}
      {data && data.length > 0 ? (
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {data.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <div>
                <Badge variant={Number(m.quantity) >= 0 ? 'green' : 'red'}>{m.type}</Badge>
                <span className="ml-2 text-slate-700">{Number(m.quantity) >= 0 ? '+' : ''}{formatNumber(m.quantity)} @ {m.warehouse.code}</span>
                {m.reason ? <span className="ml-2 text-xs text-slate-500">{m.reason}</span> : null}
                {m.reference ? <span className="ml-1 text-xs text-slate-400">({m.reference})</span> : null}
              </div>
              <div className="text-right text-xs text-slate-500">
                <div>bal {formatNumber(m.balanceAfter)}</div>
                <div>{new Date(m.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </Modal>
  );
}
