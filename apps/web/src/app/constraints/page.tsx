'use client';

import { FormEvent, useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { FormField, inputClass, selectClass, btnPrimary, btnSecondary } from '@/components/ui/FormField';
import { apiFetch } from '@/lib/api';
import { connectId } from '@/lib/prisma-connect';

type Constraint = {
  id: string;
  name: string;
  constraintType: string;
  message: string | null;
  product: { sku: string; name: string };
  relatedProduct: { sku: string; name: string } | null;
};

type Product = { id: string; sku: string; name: string };

export default function ConstraintsPage() {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    constraintType: 'requires',
    productId: '',
    relatedProductId: '',
    message: '',
  });
  const { data, loading, error, reload } = useFetch<Constraint[]>('/constraints');
  const products = useFetch<Product[]>('/products');

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    await apiFetch('/constraints', {
      method: 'POST',
      body: JSON.stringify({
        name: form.name,
        constraintType: form.constraintType,
        message: form.message || undefined,
        product: connectId(form.productId),
        relatedProduct: connectId(form.relatedProductId || undefined),
      }),
    });
    setShowModal(false);
    await reload();
  }

  return (
    <div className="p-8">
      <PageHeader title="CPQ Constraints" description="Product compatibility rules — requires, blocks, bundles" action={<button type="button" className={btnPrimary} onClick={() => setShowModal(true)}>New Constraint</button>} />
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} onRetry={reload} /> : null}
        {!loading && !error && data && data.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {data.map((c) => (
              <div key={c.id} className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-900">{c.name}</p>
                  <Badge variant={c.constraintType === 'requires' ? 'blue' : c.constraintType === 'blocks' ? 'red' : 'green'}>{c.constraintType}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {c.product.sku} {c.constraintType === 'requires' ? 'requires' : '↔'} {c.relatedProduct?.sku ?? '—'}
                </p>
                {c.message ? <p className="mt-1 text-xs text-slate-400">{c.message}</p> : null}
              </div>
            ))}
          </div>
        ) : !loading && !error ? <p className="px-6 py-12 text-center text-sm text-slate-400">No constraints defined.</p> : null}
      </div>
      <Modal open={showModal} title="New Constraint" onClose={() => setShowModal(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          <FormField label="Rule Name"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} /></FormField>
          <FormField label="Type">
            <select value={form.constraintType} onChange={(e) => setForm({ ...form, constraintType: e.target.value })} className={selectClass}>
              <option value="requires">Requires</option>
              <option value="blocks">Blocks</option>
              <option value="bundles">Bundles</option>
            </select>
          </FormField>
          <FormField label="Product">
            <select required value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} className={selectClass}>
              <option value="">Select...</option>
              {products.data?.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
            </select>
          </FormField>
          <FormField label="Related Product">
            <select value={form.relatedProductId} onChange={(e) => setForm({ ...form, relatedProductId: e.target.value })} className={selectClass}>
              <option value="">None</option>
              {products.data?.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
            </select>
          </FormField>
          <FormField label="Message"><input value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className={inputClass} /></FormField>
          <div className="flex justify-end gap-3"><button type="button" className={btnSecondary} onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className={btnPrimary}>Create</button></div>
        </form>
      </Modal>
    </div>
  );
}