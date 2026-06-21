'use client';

import { FormEvent, useState } from 'react';
import { apiFetch, apiUpload } from '@/lib/api';
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
import { FormField, inputClass, selectClass, btnPrimary, btnSecondary } from '@/components/ui/FormField';

type Lead = {
  id: string;
  companyName: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
  source: string;
  status: string;
  score: number;
  rating: string;
  owner: { firstName: string; lastName: string } | null;
};

function ratingVariant(r: string): 'red' | 'yellow' | 'green' {
  return r === 'hot' ? 'red' : r === 'warm' ? 'yellow' : 'green';
}

export default function LeadsPage() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch<Lead[]>('/leads');
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [edit, setEdit] = useState<Lead | null>(null);
  const [convert, setConvert] = useState<Lead | null>(null);
  const [history, setHistory] = useState<Lead | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    companyName: '', firstName: '', lastName: '', email: '', phone: '', title: '', source: 'web',
  });

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/leads', {
        method: 'POST',
        body: JSON.stringify({
          companyName: form.companyName,
          firstName: form.firstName || undefined,
          lastName: form.lastName || undefined,
          email: form.email || undefined,
          phone: form.phone || undefined,
          title: form.title || undefined,
          source: form.source,
          ownerId: user?.id,
        }),
      });
      setShowCreate(false);
      setForm({ companyName: '', firstName: '', lastName: '', email: '', phone: '', title: '', source: 'web' });
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create lead');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Leads"
        description="Intake, scoring, nurturing, and conversion"
        action={
          <div className="flex gap-2">
            <button type="button" className={btnSecondary} onClick={() => setShowImport(true)}>Import CSV</button>
            <button type="button" className={btnPrimary} onClick={() => setShowCreate(true)}>New Lead</button>
          </div>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} onRetry={reload} /> : null}
        {!loading && !error && data?.length === 0 ? <EmptyState title="No leads yet" /> : null}
        {!loading && !error && data && data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3">Company</th>
                  <th className="px-6 py-3">Contact</th>
                  <th className="px-6 py-3">Score</th>
                  <th className="px-6 py-3">Source</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Owner</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{lead.companyName}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {fullName(lead.firstName, lead.lastName)}
                      {lead.email ? <p className="text-xs text-slate-400">{lead.email}</p> : null}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100" title={`${lead.score}/100`}>
                          <div
                            className={`h-full rounded-full ${lead.rating === 'hot' ? 'bg-red-500' : lead.rating === 'warm' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${lead.score}%` }}
                          />
                        </div>
                        <span className="w-7 text-right text-sm font-semibold text-slate-800">{lead.score}</span>
                        <Badge variant={ratingVariant(lead.rating)}>{lead.rating}</Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4"><Badge>{lead.source}</Badge></td>
                    <td className="px-6 py-4">
                      <Badge variant={lead.status === 'converted' ? 'green' : lead.status === 'new' ? 'blue' : 'yellow'}>{lead.status}</Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {lead.owner ? fullName(lead.owner.firstName, lead.owner.lastName) : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {lead.status !== 'converted' ? (
                        <button type="button" className="font-medium text-slate-600 hover:underline" onClick={() => setEdit(lead)}>Edit</button>
                      ) : null}
                      <button type="button" className="ml-3 font-medium text-slate-500 hover:underline" onClick={() => setHistory(lead)}>History</button>
                      {lead.status !== 'converted' ? (
                        <button type="button" className="ml-3 font-medium text-blue-600 hover:underline" onClick={() => setConvert(lead)}>Convert</button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {/* Create */}
      <Modal open={showCreate} title="New Lead" onClose={() => setShowCreate(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          <FormField label="Company Name">
            <input required value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} className={inputClass} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="First Name"><input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className={inputClass} /></FormField>
            <FormField label="Last Name"><input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className={inputClass} /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Email"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} /></FormField>
            <FormField label="Phone"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Title"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} /></FormField>
            <FormField label="Source">
              <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className={selectClass}>
                <option value="web">Web</option>
                <option value="referral">Referral</option>
                <option value="partner">Partner</option>
                <option value="trade_show">Trade Show</option>
                <option value="cold_call">Cold Call</option>
                <option value="other">Other</option>
              </select>
            </FormField>
          </div>
          <p className="text-xs text-slate-400">A fit score (0–100) and hot/warm/cold rating are computed automatically.</p>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className={btnSecondary} onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" className={btnPrimary} disabled={saving}>{saving ? 'Creating…' : 'Create Lead'}</button>
          </div>
        </form>
      </Modal>

      {edit ? <EditModal lead={edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); void reload(); }} /> : null}
      {showImport ? <ImportModal onClose={() => setShowImport(false)} onDone={() => { setShowImport(false); void reload(); }} /> : null}
      {convert ? <ConvertModal lead={convert} onClose={() => setConvert(null)} onDone={() => { setConvert(null); void reload(); }} /> : null}
      {history ? <HistoryDrawer entityType="lead" entityId={history.id} title={history.companyName} onClose={() => setHistory(null)} onReverted={() => void reload()} /> : null}
    </div>
  );
}

function EditModal({ lead, onClose, onDone }: { lead: Lead; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({
    companyName: lead.companyName ?? '',
    firstName: lead.firstName ?? '',
    lastName: lead.lastName ?? '',
    email: lead.email ?? '',
    phone: lead.phone ?? '',
    title: lead.title ?? '',
    source: lead.source,
    status: lead.status,
  });
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await apiFetch(`/leads/${lead.id}`, { method: 'PATCH', body: JSON.stringify(f) });
      onDone();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open title={`Edit ${lead.companyName}`} onClose={onClose}>
      <div className="space-y-4">
        <FormField label="Company Name"><input value={f.companyName} onChange={(e) => setF({ ...f, companyName: e.target.value })} className={inputClass} /></FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="First Name"><input value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} className={inputClass} /></FormField>
          <FormField label="Last Name"><input value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} className={inputClass} /></FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Email"><input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className={inputClass} /></FormField>
          <FormField label="Phone"><input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className={inputClass} /></FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Title"><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={inputClass} /></FormField>
          <FormField label="Source">
            <select value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} className={selectClass}>
              <option value="web">Web</option>
              <option value="referral">Referral</option>
              <option value="partner">Partner</option>
              <option value="trade_show">Trade Show</option>
              <option value="cold_call">Cold Call</option>
              <option value="other">Other</option>
            </select>
          </FormField>
        </div>
        <FormField label="Status">
          <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} className={selectClass}>
            <option value="new">New</option>
            <option value="working">Working</option>
            <option value="qualified">Qualified</option>
            <option value="disqualified">Disqualified</option>
          </select>
        </FormField>
        <p className="text-xs text-slate-400">Score &amp; rating are recomputed automatically; changes are logged and reversible.</p>
        <div className="flex justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={onClose}>Cancel</button>
          <button type="button" className={btnPrimary} onClick={save} disabled={busy || !f.companyName}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </Modal>
  );
}

function ImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [csv, setCsv] = useState('companyName,firstName,lastName,email,phone,source\n');
  const [result, setResult] = useState<{ imported: number; failed: number; errors: { row: number; message: string }[] } | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const res = await apiFetch<typeof result>('/leads/import', { method: 'POST', body: JSON.stringify({ csv }) });
      setResult(res);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setCsv(await file.text());
  }

  return (
    <Modal open title="Import leads from CSV" onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs text-slate-500">First row must be a header. Recognized columns: companyName, firstName, lastName, email, phone, title, source.</p>
        <input type="file" accept=".csv,text/csv" onChange={onFile} className="text-sm" />
        <textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={8} className={`${inputClass} font-mono text-xs`} />
        {result ? (
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <p className="text-emerald-700">Imported {result.imported}</p>
            {result.failed > 0 ? (
              <div className="text-red-600">
                <p>Failed {result.failed}:</p>
                {result.errors.map((er) => <p key={er.row} className="text-xs">row {er.row}: {er.message}</p>)}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="flex justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={result ? onDone : onClose}>{result ? 'Done' : 'Cancel'}</button>
          <button type="button" className={btnPrimary} onClick={run} disabled={busy}>{busy ? 'Importing…' : 'Import'}</button>
        </div>
      </div>
    </Modal>
  );
}

type ConvertResult = { convertedAccount: { id: string } | null };

function ConvertModal({ lead, onClose, onDone }: { lead: Lead; onClose: () => void; onDone: () => void }) {
  const [createDeal, setCreateDeal] = useState(true);
  const [acc, setAcc] = useState({ country: '', vatNumber: '', gstNumber: '', tradeLicenseNumber: '', registrationNumber: '', addressLine: '', city: '' });
  const [contactMobile, setContactMobile] = useState('');
  const [docs, setDocs] = useState<{ tradeLicense?: File; gst?: File; tax?: File }>({});
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const res = await apiFetch<ConvertResult>(`/leads/${lead.id}/convert`, {
        method: 'POST',
        body: JSON.stringify({
          createDeal,
          account: {
            country: acc.country || undefined,
            vatNumber: acc.vatNumber || undefined,
            gstNumber: acc.gstNumber || undefined,
            tradeLicenseNumber: acc.tradeLicenseNumber || undefined,
            registrationNumber: acc.registrationNumber || undefined,
            billingAddress: acc.addressLine || acc.city ? { line1: acc.addressLine, city: acc.city, country: acc.country } : undefined,
          },
          contact: {
            mobile: contactMobile || undefined,
            country: acc.country || undefined,
            address: acc.addressLine || acc.city ? { line1: acc.addressLine, city: acc.city, country: acc.country } : undefined,
          },
        }),
      });

      // Attach compliance documents to the new account, if provided.
      const accountId = res.convertedAccount?.id;
      if (accountId) {
        const uploads: { file?: File; label: string }[] = [
          { file: docs.tradeLicense, label: 'Trade License' },
          { file: docs.gst, label: 'GST/Tax Document' },
          { file: docs.tax, label: 'Tax Document' },
        ];
        for (const u of uploads) {
          if (!u.file) continue;
          const fd = new FormData();
          fd.append('file', u.file);
          fd.append('name', `${u.label} — ${lead.companyName}`);
          fd.append('accountId', accountId);
          await apiUpload('/documents/upload', fd);
        }
      }
      onDone();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Convert failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open title={`Convert ${lead.companyName}`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Creates an Account (company) + primary Contact ({fullName(lead.firstName, lead.lastName) || 'individual'}), optionally a Deal.</p>
        <p className="text-sm font-medium text-slate-700">Account / company details</p>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Country"><input value={acc.country} onChange={(e) => setAcc({ ...acc, country: e.target.value })} className={inputClass} placeholder="e.g. AE" /></FormField>
          <FormField label="VAT Number"><input value={acc.vatNumber} onChange={(e) => setAcc({ ...acc, vatNumber: e.target.value })} className={inputClass} /></FormField>
          <FormField label="GST Number"><input value={acc.gstNumber} onChange={(e) => setAcc({ ...acc, gstNumber: e.target.value })} className={inputClass} /></FormField>
          <FormField label="Trade License #"><input value={acc.tradeLicenseNumber} onChange={(e) => setAcc({ ...acc, tradeLicenseNumber: e.target.value })} className={inputClass} /></FormField>
          <FormField label="Registration #"><input value={acc.registrationNumber} onChange={(e) => setAcc({ ...acc, registrationNumber: e.target.value })} className={inputClass} /></FormField>
          <FormField label="City"><input value={acc.city} onChange={(e) => setAcc({ ...acc, city: e.target.value })} className={inputClass} /></FormField>
        </div>
        <FormField label="Address"><input value={acc.addressLine} onChange={(e) => setAcc({ ...acc, addressLine: e.target.value })} className={inputClass} /></FormField>
        <FormField label="Contact mobile"><input value={contactMobile} onChange={(e) => setContactMobile(e.target.value)} className={inputClass} /></FormField>
        <p className="text-sm font-medium text-slate-700">Compliance documents (optional)</p>
        <div className="space-y-2 text-xs text-slate-600">
          <label className="flex items-center justify-between gap-2">
            <span>Trade License</span>
            <input type="file" onChange={(e) => setDocs({ ...docs, tradeLicense: e.target.files?.[0] })} />
          </label>
          <label className="flex items-center justify-between gap-2">
            <span>GST Document</span>
            <input type="file" onChange={(e) => setDocs({ ...docs, gst: e.target.files?.[0] })} />
          </label>
          <label className="flex items-center justify-between gap-2">
            <span>Tax Document</span>
            <input type="file" onChange={(e) => setDocs({ ...docs, tax: e.target.files?.[0] })} />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={createDeal} onChange={(e) => setCreateDeal(e.target.checked)} /> Also create a Deal (linked to the new contact)
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={onClose}>Cancel</button>
          <button type="button" className={btnPrimary} onClick={run} disabled={busy}>{busy ? 'Converting…' : 'Convert Lead'}</button>
        </div>
      </div>
    </Modal>
  );
}
