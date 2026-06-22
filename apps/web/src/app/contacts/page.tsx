'use client';

import { FormEvent, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { connectId } from '@/lib/prisma-connect';
import { useFetch } from '@/hooks/useFetch';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { HistoryDrawer } from '@/components/HistoryDrawer';
import { ActivitiesPanel } from '@/components/ActivitiesPanel';
import { DocumentsPanel } from '@/components/DocumentsPanel';
import { CsvImportModal, SAMPLE_CONTACTS_CSV } from '@/components/CsvImportModal';
import {
  FormField,
  inputClass,
  selectClass,
  btnPrimary,
  btnSecondary,
} from '@/components/ui/FormField';

type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  title: string | null;
  isPrimary: boolean;
  account: { id: string; name: string };
};

type Account = { id: string; name: string };

export default function ContactsPage() {
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<Contact | null>(null);
  const [edit, setEdit] = useState<Contact | null>(null);
  const [activities, setActivities] = useState<Contact | null>(null);
  const [docs, setDocs] = useState<Contact | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    title: '',
    accountId: '',
  });

  const { data, loading, error, reload } = useFetch<Contact[]>('/contacts');
  const accounts = useFetch<Account[]>('/accounts');

  async function clickToCall(contact: Contact) {
    if (!contact.phone) return;
    try {
      const result = await apiFetch<{ telUrl: string; logged: boolean }>('/cti/dial', {
        method: 'POST',
        body: JSON.stringify({
          phone: contact.phone,
          contactId: contact.id,
          subject: `Call ${contact.firstName} ${contact.lastName}`,
        }),
      });
      if (result.logged) {
        window.open(result.telUrl, '_self');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Call failed');
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/contacts', {
        method: 'POST',
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email || undefined,
          phone: form.phone || undefined,
          title: form.title || undefined,
          account: connectId(form.accountId),
        }),
      });
      setShowModal(false);
      setForm({ firstName: '', lastName: '', email: '', phone: '', title: '', accountId: '' });
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create contact');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Contacts"
        description="Multi-stakeholder mapping across accounts and deals"
        action={
          <div className="flex gap-2">
            <button type="button" className={btnSecondary} onClick={() => setShowImport(true)}>Import CSV</button>
            <button type="button" className={btnPrimary} onClick={() => setShowModal(true)}>New Contact</button>
          </div>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} onRetry={reload} /> : null}
        {!loading && !error && data?.length === 0 ? (
          <EmptyState title="No contacts yet" />
        ) : null}
        {!loading && !error && data && data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Account</th>
                  <th className="px-6 py-3">Title</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Phone</th>
                  <th className="px-6 py-3">CTI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {c.firstName} {c.lastName}
                        </span>
                        {c.isPrimary ? <Badge variant="blue">Primary</Badge> : null}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{c.account.name}</td>
                    <td className="px-6 py-4 text-slate-600">{c.title ?? '—'}</td>
                    <td className="px-6 py-4 text-slate-600">{c.email ?? '—'}</td>
                    <td className="px-6 py-4 text-slate-600">{c.phone ?? '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {c.phone ? (
                        <button
                          type="button"
                          className="text-sm font-medium text-green-600 hover:text-green-700"
                          onClick={() => clickToCall(c)}
                        >
                          📞 Call
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="ml-3 text-sm font-medium text-slate-600 hover:underline"
                        onClick={() => setEdit(c)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="ml-3 text-sm font-medium text-slate-500 hover:underline"
                        onClick={() => setDocs(c)}
                      >
                        Docs
                      </button>
                      <button
                        type="button"
                        className="ml-3 text-sm font-medium text-slate-500 hover:underline"
                        onClick={() => setActivities(c)}
                      >
                        Activities
                      </button>
                      <button
                        type="button"
                        className="ml-3 text-sm font-medium text-slate-500 hover:underline"
                        onClick={() => setHistory(c)}
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

      <Modal open={showModal} title="New Contact" onClose={() => setShowModal(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          <FormField label="Account">
            <select
              required
              value={form.accountId}
              onChange={(e) => setForm({ ...form, accountId: e.target.value })}
              className={selectClass}
            >
              <option value="">Select account...</option>
              {accounts.data?.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="First Name">
              <input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className={inputClass} />
            </FormField>
            <FormField label="Last Name">
              <input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className={inputClass} />
            </FormField>
          </div>
          <FormField label="Email">
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
          </FormField>
          <FormField label="Phone">
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
          </FormField>
          <FormField label="Title">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className={btnSecondary} onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className={btnPrimary} disabled={saving}>{saving ? 'Creating...' : 'Create Contact'}</button>
          </div>
        </form>
      </Modal>

      {history ? (
        <HistoryDrawer
          entityType="contact"
          entityId={history.id}
          title={`${history.firstName} ${history.lastName}`}
          onClose={() => setHistory(null)}
          onReverted={() => void reload()}
        />
      ) : null}

      {edit ? (
        <EditContactModal
          contact={edit}
          accounts={accounts.data ?? []}
          onClose={() => setEdit(null)}
          onDone={() => { setEdit(null); void reload(); }}
        />
      ) : null}
      {activities ? (
        <ActivitiesPanel
          relatedType="contact"
          relatedId={activities.id}
          title={`${activities.firstName} ${activities.lastName}`}
          onClose={() => setActivities(null)}
        />
      ) : null}
      {docs ? (
        <DocumentsPanel
          entityType="contact"
          entityId={docs.id}
          title={`${docs.firstName} ${docs.lastName}`}
          onClose={() => setDocs(null)}
        />
      ) : null}
      {showImport ? (
        <CsvImportModal
          endpoint="/contacts/import"
          title="Import Contacts from CSV"
          hint="Header row required. Columns: firstName (required), lastName (required), accountName (must match an existing account), email, phone, mobile, title, country."
          sampleCsv={SAMPLE_CONTACTS_CSV}
          sampleName="contacts-sample.csv"
          onClose={() => setShowImport(false)}
          onDone={() => { setShowImport(false); void reload(); }}
        />
      ) : null}
    </div>
  );
}

function EditContactModal({
  contact,
  accounts,
  onClose,
  onDone,
}: {
  contact: Contact;
  accounts: Account[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [f, setF] = useState({
    firstName: contact.firstName ?? '',
    lastName: contact.lastName ?? '',
    email: contact.email ?? '',
    phone: contact.phone ?? '',
    mobile: contact.mobile ?? '',
    title: contact.title ?? '',
    accountId: contact.account.id,
  });
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const { accountId, ...rest } = f;
      await apiFetch(`/contacts/${contact.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...rest, account: { connect: { id: accountId } } }),
      });
      onDone();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open title={`Edit ${contact.firstName} ${contact.lastName}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="First Name"><input value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} className={inputClass} /></FormField>
          <FormField label="Last Name"><input value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} className={inputClass} /></FormField>
          <FormField label="Email"><input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className={inputClass} /></FormField>
          <FormField label="Title"><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={inputClass} /></FormField>
          <FormField label="Phone"><input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className={inputClass} /></FormField>
          <FormField label="Mobile"><input value={f.mobile} onChange={(e) => setF({ ...f, mobile: e.target.value })} className={inputClass} /></FormField>
        </div>
        <FormField label="Account">
          <select value={f.accountId} onChange={(e) => setF({ ...f, accountId: e.target.value })} className={selectClass}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </FormField>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className={btnSecondary} onClick={onClose}>Cancel</button>
          <button type="button" className={btnPrimary} onClick={save} disabled={busy || !f.firstName}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </Modal>
  );
}