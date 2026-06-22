'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { connectId } from '@/lib/prisma-connect';
import { useAuth } from '@/context/AuthContext';
import { useFetch } from '@/hooks/useFetch';
import { fullName } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { HistoryDrawer } from '@/components/HistoryDrawer';
import { ActivitiesPanel } from '@/components/ActivitiesPanel';
import { DocumentsPanel } from '@/components/DocumentsPanel';
import {
  FormField,
  inputClass,
  selectClass,
  btnPrimary,
  btnSecondary,
} from '@/components/ui/FormField';

type Account = {
  id: string;
  name: string;
  accountType: string;
  healthScore: string | null;
  industry: string | null;
  paymentTerms: string | null;
  country?: string | null;
  vatNumber?: string | null;
  gstNumber?: string | null;
  tradeLicenseNumber?: string | null;
  registrationNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  territory: { name: string } | null;
  owner: { firstName: string; lastName: string } | null;
};

type Territory = { id: string; name: string };

export default function AccountsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<Account | null>(null);
  const [edit, setEdit] = useState<Account | null>(null);
  const [activities, setActivities] = useState<Account | null>(null);
  const [docs, setDocs] = useState<Account | null>(null);
  const [form, setForm] = useState({
    name: '',
    accountType: 'customer',
    industry: '',
    paymentTerms: 'Net 30',
  });

  const path = useMemo(
    () => (search ? `/accounts?search=${encodeURIComponent(search)}` : '/accounts'),
    [search],
  );
  const { data, loading, error, reload } = useFetch<Account[]>(path, [search]);
  const territories = useFetch<Territory[]>('/territories');
  const churn = useFetch<{
    accounts: { accountId: string; churnRisk: number; label: string; daysSinceLastOrder: number | null }[];
  }>('/ai/churn-risk');
  const churnMap = Object.fromEntries((churn.data?.accounts ?? []).map((c) => [c.accountId, c]));

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/accounts', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          accountType: form.accountType,
          industry: form.industry || undefined,
          paymentTerms: form.paymentTerms || undefined,
          owner: connectId(user?.id),
          territory: connectId(territories.data?.[0]?.id),
        }),
      });
      setShowModal(false);
      setForm({ name: '', accountType: 'customer', industry: '', paymentTerms: 'Net 30' });
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Accounts"
        description="Customer 360° — hierarchies, territories, and health scoring"
        action={
          <button type="button" className={btnPrimary} onClick={() => setShowModal(true)}>
            New Account
          </button>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search accounts..."
            className="w-full max-w-md rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {loading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} onRetry={reload} /> : null}

        {!loading && !error && data?.length === 0 ? (
          <EmptyState title="No accounts found" description="Create your first account to get started." />
        ) : null}

        {!loading && !error && data && data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3">Account</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Health</th>
                  <th className="px-6 py-3">Churn Risk</th>
                  <th className="px-6 py-3">Territory</th>
                  <th className="px-6 py-3">Owner</th>
                  <th className="px-6 py-3">Terms</th>
                  <th className="px-6 py-3">360°</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((account) => (
                  <tr key={account.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{account.name}</p>
                      {account.industry ? (
                        <p className="text-xs text-slate-500">{account.industry}</p>
                      ) : null}
                    </td>
                    <td className="px-6 py-4">
                      <Badge>{account.accountType}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      {account.healthScore ? (
                        <Badge variant={account.healthScore === 'active' ? 'green' : 'yellow'}>
                          {account.healthScore.replace('_', ' ')}
                        </Badge>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {churnMap[account.id] ? (
                        <div>
                          <Badge variant={churnMap[account.id].label === 'high' ? 'red' : churnMap[account.id].label === 'medium' ? 'yellow' : 'green'}>
                            {churnMap[account.id].churnRisk}%
                          </Badge>
                          {churnMap[account.id].daysSinceLastOrder != null ? (
                            <p className="mt-0.5 text-xs text-slate-400">{churnMap[account.id].daysSinceLastOrder}d since order</p>
                          ) : null}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {account.territory?.name ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {account.owner ? fullName(account.owner.firstName, account.owner.lastName) : '—'}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {account.paymentTerms ?? '—'}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/accounts/${account.id}`}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View graph
                      </Link>
                      <button
                        type="button"
                        className="ml-3 text-xs text-slate-600 hover:underline"
                        onClick={() => setEdit(account)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="ml-3 text-xs text-slate-500 hover:underline"
                        onClick={() => setDocs(account)}
                      >
                        Docs
                      </button>
                      <button
                        type="button"
                        className="ml-3 text-xs text-slate-500 hover:underline"
                        onClick={() => setActivities(account)}
                      >
                        Activities
                      </button>
                      <button
                        type="button"
                        className="ml-3 text-xs text-slate-500 hover:underline"
                        onClick={() => setHistory(account)}
                      >
                        History
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <Modal open={showModal} title="New Account" onClose={() => setShowModal(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          <FormField label="Account Name">
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
            />
          </FormField>
          <FormField label="Type">
            <select
              value={form.accountType}
              onChange={(e) => setForm({ ...form, accountType: e.target.value })}
              className={selectClass}
            >
              <option value="customer">Customer</option>
              <option value="prospect">Prospect</option>
              <option value="partner">Partner</option>
            </select>
          </FormField>
          <FormField label="Industry">
            <input
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              className={inputClass}
            />
          </FormField>
          <FormField label="Payment Terms">
            <input
              value={form.paymentTerms}
              onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
              className={inputClass}
            />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className={btnSecondary} onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button type="submit" className={btnPrimary} disabled={saving}>
              {saving ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>

      {history ? (
        <HistoryDrawer
          entityType="account"
          entityId={history.id}
          title={history.name}
          onClose={() => setHistory(null)}
          onReverted={() => void reload()}
        />
      ) : null}

      {edit ? <EditAccountModal account={edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); void reload(); }} /> : null}
      {activities ? <ActivitiesPanel relatedType="account" relatedId={activities.id} title={activities.name} onClose={() => setActivities(null)} /> : null}
      {docs ? <DocumentsPanel entityType="account" entityId={docs.id} title={docs.name} onClose={() => setDocs(null)} /> : null}
    </div>
  );
}

function EditAccountModal({ account, onClose, onDone }: { account: Account; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({
    name: account.name ?? '',
    accountType: account.accountType ?? 'customer',
    industry: account.industry ?? '',
    paymentTerms: account.paymentTerms ?? '',
    country: account.country ?? '',
    vatNumber: account.vatNumber ?? '',
    gstNumber: account.gstNumber ?? '',
    tradeLicenseNumber: account.tradeLicenseNumber ?? '',
    registrationNumber: account.registrationNumber ?? '',
    email: account.email ?? '',
    phone: account.phone ?? '',
    website: account.website ?? '',
  });
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await apiFetch(`/accounts/${account.id}`, { method: 'PATCH', body: JSON.stringify(f) });
      onDone();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open title={`Edit ${account.name}`} onClose={onClose}>
      <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
        <FormField label="Name"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputClass} /></FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Type">
            <select value={f.accountType} onChange={(e) => setF({ ...f, accountType: e.target.value })} className={selectClass}>
              <option value="customer">Customer</option>
              <option value="prospect">Prospect</option>
              <option value="partner">Partner</option>
              <option value="vendor">Vendor</option>
            </select>
          </FormField>
          <FormField label="Industry"><input value={f.industry} onChange={(e) => setF({ ...f, industry: e.target.value })} className={inputClass} /></FormField>
          <FormField label="Country"><input value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} className={inputClass} /></FormField>
          <FormField label="Payment Terms"><input value={f.paymentTerms} onChange={(e) => setF({ ...f, paymentTerms: e.target.value })} className={inputClass} /></FormField>
          <FormField label="VAT Number"><input value={f.vatNumber} onChange={(e) => setF({ ...f, vatNumber: e.target.value })} className={inputClass} /></FormField>
          <FormField label="GST Number"><input value={f.gstNumber} onChange={(e) => setF({ ...f, gstNumber: e.target.value })} className={inputClass} /></FormField>
          <FormField label="Trade License #"><input value={f.tradeLicenseNumber} onChange={(e) => setF({ ...f, tradeLicenseNumber: e.target.value })} className={inputClass} /></FormField>
          <FormField label="Registration #"><input value={f.registrationNumber} onChange={(e) => setF({ ...f, registrationNumber: e.target.value })} className={inputClass} /></FormField>
          <FormField label="Email"><input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className={inputClass} /></FormField>
          <FormField label="Phone"><input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className={inputClass} /></FormField>
        </div>
        <FormField label="Website"><input value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} className={inputClass} /></FormField>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className={btnSecondary} onClick={onClose}>Cancel</button>
          <button type="button" className={btnPrimary} onClick={save} disabled={busy || !f.name}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </Modal>
  );
}