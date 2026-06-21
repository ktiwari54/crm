'use client';

import { FormEvent, use, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { useFetch } from '@/hooks/useFetch';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import {
  FormField,
  inputClass,
  selectClass,
  btnPrimary,
  btnSecondary,
} from '@/components/ui/FormField';

type QuoteDetail = {
  id: string;
  quoteNumber: string;
  status: string;
  isLocked: boolean;
  subtotal: string;
  taxAmount: string;
  total: string;
  marginPercent: string | null;
  currency: string;
  account: { name: string };
  deal: { name: string } | null;
  lineItems: {
    id: string;
    lineNumber: number;
    quantity: string;
    unitPrice: string;
    discountPercent: string;
    lineTotal: string;
    atpWarning: boolean;
    atpAtQuoteTime: string | null;
    product: { id: string; sku: string; name: string };
    warehouse: { code: string } | null;
  }[];
};

type Product = {
  id: string;
  sku: string;
  name: string;
  inventoryLevels: { warehouse: { id: string; code: string }; atp: string }[];
};

export default function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    productId: '',
    quantity: '1',
    warehouseId: '',
    discountPercent: '0',
  });

  const { data, loading, error, reload } = useFetch<QuoteDetail>(`/quotes/${id}`, [id]);
  const products = useFetch<Product[]>('/products');
  const [actionLoading, setActionLoading] = useState('');
  const [destCountry, setDestCountry] = useState('CN');
  const [exportScreen, setExportScreen] = useState<{
    status: string;
    blocked: boolean;
    message: string;
    blockedLines: { sku: string; reason: string }[];
  } | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch<{ status: string; results: { lines: { blocked: boolean; sku: string; reason: string | null }[] }; destinationCountry: string }[]>(
      `/compliance/screening?quoteId=${id}`,
    )
      .then((screenings) => {
        const latest = screenings[0];
        if (!latest) return;
        const results = latest.results as { lines: { blocked: boolean; sku: string; reason: string | null }[] };
        const blockedLines = results.lines.filter((l) => l.blocked).map((l) => ({ sku: l.sku, reason: l.reason ?? '' }));
        setExportScreen({
          status: latest.status,
          blocked: blockedLines.length > 0,
          message: blockedLines.length > 0
            ? `${blockedLines.length} line(s) blocked for ${latest.destinationCountry}`
            : `Export clear for ${latest.destinationCountry}`,
          blockedLines,
        });
        setDestCountry(latest.destinationCountry);
      })
      .catch(() => {});
  }, [id]);

  async function runExportScreen() {
    setActionLoading('export');
    try {
      const result = await apiFetch<{
        status: string;
        blocked: boolean;
        message: string;
        blockedLines: { sku: string; reason: string }[];
      }>('/compliance/screening', {
        method: 'POST',
        body: JSON.stringify({ quoteId: id, destinationCountry: destCountry }),
      });
      setExportScreen(result);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Screening failed');
    } finally {
      setActionLoading('');
    }
  }

  async function runAction(action: string, fn: () => Promise<unknown>) {
    setActionLoading(action);
    try {
      await fn();
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading('');
    }
  }

  const selectedProduct = products.data?.find((p) => p.id === form.productId);

  async function handleAddLine(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch(`/quotes/${id}/line-items`, {
        method: 'POST',
        body: JSON.stringify({
          productId: form.productId,
          quantity: Number(form.quantity),
          warehouseId: form.warehouseId || undefined,
          discountPercent: Number(form.discountPercent),
        }),
      });
      setForm({ productId: '', quantity: '1', warehouseId: '', discountPercent: '0' });
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add line item');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8"><LoadingState /></div>;
  if (error || !data) return <div className="p-8"><ErrorState message={error || 'Quote not found'} /></div>;

  return (
    <div className="p-8">
      <PageHeader
        title={data.quoteNumber}
        description={`${data.account.name}${data.deal ? ` · ${data.deal.name}` : ''}`}
        action={
          <Link href="/quotes" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            ← Back to Quotes
          </Link>
        }
      />

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <FormField label="Export destination (ISO country)">
            <input className={inputClass} value={destCountry} onChange={(e) => setDestCountry(e.target.value.toUpperCase())} maxLength={2} style={{ width: 80 }} />
          </FormField>
          <button type="button" className={btnSecondary} disabled={!!actionLoading} onClick={runExportScreen}>
            {actionLoading === 'export' ? 'Screening...' : 'Run Export Screening'}
          </button>
        </div>
        {exportScreen ? (
          <div className={`mt-3 rounded-lg px-4 py-3 text-sm ${exportScreen.blocked ? 'border border-red-200 bg-red-50 text-red-800' : 'border border-amber-200 bg-amber-50 text-amber-800'}`}>
            <p className="font-medium">{exportScreen.blocked ? '⛔ Export Blocked' : '✓ Export Screening'}</p>
            <p>{exportScreen.message}</p>
            {exportScreen.blockedLines.length > 0 ? (
              <ul className="mt-2 list-disc pl-5">
                {exportScreen.blockedLines.map((l) => (
                  <li key={l.sku}>{l.sku}: {l.reason}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        {data.status === 'draft' ? (
          <button type="button" className={btnPrimary} disabled={!!actionLoading} onClick={() => runAction('submit', () => apiFetch(`/approvals/quotes/${id}/submit`, { method: 'POST' }))}>
            {actionLoading === 'submit' ? 'Submitting...' : 'Submit for Approval'}
          </button>
        ) : null}
        {data.status === 'sent' ? (
          <button type="button" className={btnPrimary} disabled={!!actionLoading} onClick={() => runAction('accept', () => apiFetch(`/quotes/${id}/accept`, { method: 'POST' }))}>
            {actionLoading === 'accept' ? 'Accepting...' : 'Accept Quote'}
          </button>
        ) : null}
        {data.status === 'accepted' ? (
          <button type="button" className={btnSecondary} disabled={!!actionLoading} onClick={() => runAction('order', () => apiFetch(`/orders/from-quote/${id}`, { method: 'POST' }))}>
            {actionLoading === 'order' ? 'Creating...' : 'Create Order'}
          </button>
        ) : null}
        {data.isLocked ? <Badge variant="yellow">Locked — pending approval</Badge> : null}
      </div>

      <div className="mb-6 flex flex-wrap gap-4">
        <Stat label="Status" value={<Badge variant="blue">{data.status}</Badge>} />
        <Stat label="Currency" value={<Badge variant="purple">{data.currency}</Badge>} />
        <Stat label="Subtotal" value={formatCurrency(data.subtotal, data.currency)} />
        <Stat label="Tax" value={formatCurrency(data.taxAmount, data.currency)} />
        <Stat label="Total" value={formatCurrency(data.total, data.currency)} />
        <Stat label="Margin" value={formatPercent(data.marginPercent)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="font-semibold text-slate-900">Line Items</h2>
          </div>
          {data.lineItems.length === 0 ? (
            <p className="px-6 py-8 text-sm text-slate-400">No line items yet. Add products below.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Qty</th>
                    <th className="px-4 py-3">Unit Price</th>
                    <th className="px-4 py-3">Disc %</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">ATP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.lineItems.map((line) => (
                    <tr key={line.id}>
                      <td className="px-4 py-3">{line.lineNumber}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{line.product.name}</p>
                        <p className="text-xs text-slate-500">{line.product.sku}</p>
                      </td>
                      <td className="px-4 py-3">{formatNumber(line.quantity)}</td>
                      <td className="px-4 py-3">{formatCurrency(line.unitPrice)}</td>
                      <td className="px-4 py-3">{line.discountPercent}%</td>
                      <td className="px-4 py-3 font-medium">{formatCurrency(line.lineTotal)}</td>
                      <td className="px-4 py-3">
                        {line.atpWarning ? (
                          <Badge variant="red">⚠ {formatNumber(line.atpAtQuoteTime)} ATP</Badge>
                        ) : (
                          <span className="text-slate-500">{formatNumber(line.atpAtQuoteTime)}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">Add Line Item</h2>
          <form onSubmit={handleAddLine} className="space-y-4">
            <FormField label="Product">
              <select
                required
                value={form.productId}
                onChange={(e) => setForm({ ...form, productId: e.target.value, warehouseId: '' })}
                className={selectClass}
              >
                <option value="">Select product...</option>
                {products.data?.map((p) => (
                  <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Warehouse">
              <select
                value={form.warehouseId}
                onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}
                className={selectClass}
              >
                <option value="">Default</option>
                {selectedProduct?.inventoryLevels.map((l) => (
                  <option key={l.warehouse.id} value={l.warehouse.id}>
                    {l.warehouse.code} ({formatNumber(l.atp)} ATP)
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Quantity">
              <input type="number" min="1" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className={inputClass} />
            </FormField>
            <FormField label="Discount %">
              <input type="number" min="0" max="100" value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: e.target.value })} className={inputClass} />
            </FormField>
            <button type="submit" className={`${btnPrimary} w-full`} disabled={saving || data.isLocked}>
              {saving ? 'Adding...' : 'Add Line Item'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}