'use client';

import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { apiFetch } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { FormField, inputClass, selectClass, btnPrimary, btnSecondary } from '@/components/ui/FormField';

type Installment = {
  installmentNumber: number;
  dueDate: string;
  amount: string;
  status: string;
};

type BillingSchedule = {
  id: string;
  name: string;
  status: string;
  totalAmount: string;
  erpSyncStatus: string | null;
  installments: Installment[];
};

type Payment = {
  id: string;
  amount: string;
  method: string;
  status: string;
  reference: string | null;
  receivedAt: string;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  total: string;
  amountPaid: string;
  dueDate: string | null;
  account: { name: string };
  order: { orderNumber: string } | null;
  billingSchedules: BillingSchedule[];
  payments: Payment[];
};

const PAYMENT_METHODS = ['card', 'bank_transfer', 'ach', 'wire', 'check', 'cash', 'other'];

function statusVariant(status: string): 'green' | 'yellow' | 'red' | 'default' {
  if (status === 'paid') return 'green';
  if (status === 'partial') return 'yellow';
  if (status === 'overdue' || status === 'void') return 'red';
  return 'default';
}

export default function InvoicesPage() {
  const { data, loading, error, reload } = useFetch<Invoice[]>('/invoices');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [payFor, setPayFor] = useState<Invoice | null>(null);

  return (
    <div className="p-8">
      <PageHeader title="Invoices" description="Billing, payments, DSO tracking, and installment schedules" />
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} onRetry={reload} /> : null}
        {!loading && !error && data && data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3">Invoice #</th>
                  <th className="px-6 py-3">Account</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Total</th>
                  <th className="px-6 py-3 text-right">Paid</th>
                  <th className="px-6 py-3 text-right">Balance</th>
                  <th className="px-6 py-3">Due</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((inv) => (
                  <InvoiceRows
                    key={inv.id}
                    inv={inv}
                    isExpanded={expanded === inv.id}
                    onToggle={() => setExpanded(expanded === inv.id ? null : inv.id)}
                    onPay={() => setPayFor(inv)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : !loading && !error ? (
          <p className="px-6 py-12 text-center text-sm text-slate-400">No invoices yet.</p>
        ) : null}
      </div>

      {payFor ? (
        <RecordPaymentModal
          invoice={payFor}
          onClose={() => setPayFor(null)}
          onSaved={() => {
            setPayFor(null);
            void reload();
          }}
        />
      ) : null}
    </div>
  );
}

function InvoiceRows({
  inv,
  isExpanded,
  onToggle,
  onPay,
}: {
  inv: Invoice;
  isExpanded: boolean;
  onToggle: () => void;
  onPay: () => void;
}) {
  const balance = Number(inv.total) - Number(inv.amountPaid);
  return (
    <>
      <tr className="hover:bg-slate-50">
        <td className="px-6 py-4 font-medium">{inv.invoiceNumber}</td>
        <td className="px-6 py-4">{inv.account.name}</td>
        <td className="px-6 py-4"><Badge variant={statusVariant(inv.status)}>{inv.status}</Badge></td>
        <td className="px-6 py-4 text-right font-medium">{formatCurrency(inv.total)}</td>
        <td className="px-6 py-4 text-right text-emerald-700">{formatCurrency(inv.amountPaid)}</td>
        <td className="px-6 py-4 text-right font-medium text-slate-900">{formatCurrency(balance)}</td>
        <td className="px-6 py-4">{formatDate(inv.dueDate)}</td>
        <td className="px-6 py-4 whitespace-nowrap text-right">
          {balance > 0.005 ? (
            <button type="button" className="text-xs font-medium text-blue-600 hover:underline" onClick={onPay}>
              Record Payment
            </button>
          ) : null}
          {inv.billingSchedules.length > 0 || inv.payments.length > 0 ? (
            <button type="button" className="ml-3 text-xs font-medium text-slate-500 hover:underline" onClick={onToggle}>
              {isExpanded ? 'Hide' : 'Details'}
            </button>
          ) : null}
        </td>
      </tr>
      {isExpanded ? (
        <tr className="bg-slate-50">
          <td colSpan={8} className="px-8 py-4">
            {inv.payments.length > 0 ? (
              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Payments</p>
                <div className="flex flex-wrap gap-2">
                  {inv.payments.map((p) => (
                    <span key={p.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                      {formatCurrency(p.amount)} · {p.method} · {formatDate(p.receivedAt)}{' '}
                      {p.reference ? <span className="text-slate-400">({p.reference})</span> : null}{' '}
                      <Badge variant={p.status === 'succeeded' ? 'green' : p.status.includes('refund') ? 'yellow' : 'default'}>{p.status}</Badge>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {inv.billingSchedules.map((sched) => (
              <div key={sched.id} className="mb-2">
                <p className="font-medium text-slate-800">{sched.name}</p>
                <p className="text-xs text-slate-500">
                  {formatCurrency(sched.totalAmount)} · {sched.status}
                  {sched.erpSyncStatus ? ` · ERP: ${sched.erpSyncStatus}` : ''}
                </p>
                <div className="mt-2 flex flex-wrap gap-3">
                  {sched.installments.map((inst) => (
                    <span key={inst.installmentNumber} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                      #{inst.installmentNumber} · {formatDate(inst.dueDate)} · {formatCurrency(inst.amount)}{' '}
                      <Badge variant={inst.status === 'paid' ? 'green' : inst.status === 'overdue' ? 'red' : 'default'}>{inst.status}</Badge>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </td>
        </tr>
      ) : null}
    </>
  );
}

function RecordPaymentModal({
  invoice,
  onClose,
  onSaved,
}: {
  invoice: Invoice;
  onClose: () => void;
  onSaved: () => void;
}) {
  const balance = Number(invoice.total) - Number(invoice.amountPaid);
  const [amount, setAmount] = useState(balance.toFixed(2));
  const [method, setMethod] = useState('wire');
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    setError('');
    try {
      await apiFetch(`/invoices/${invoice.id}/payments`, {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(amount),
          method,
          reference: reference || undefined,
        }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title={`Record payment — ${invoice.invoiceNumber}`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          Outstanding balance: <span className="font-medium text-slate-900">{formatCurrency(balance)}</span>
        </p>
        <FormField label="Amount">
          <input type="number" step="0.01" className={inputClass} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </FormField>
        <FormField label="Method">
          <select className={selectClass} value={method} onChange={(e) => setMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Reference">
          <input className={inputClass} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. WIRE-12345" />
        </FormField>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={onClose}>Cancel</button>
          <button type="button" className={btnPrimary} onClick={submit} disabled={saving || !amount || Number(amount) <= 0}>
            {saving ? 'Saving…' : 'Record Payment'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
