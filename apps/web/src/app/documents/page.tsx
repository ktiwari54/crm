'use client';

import { FormEvent, useRef, useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { formatDateTime, fullName } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { FormField, inputClass, selectClass, btnPrimary, btnSecondary } from '@/components/ui/FormField';
import { apiFetch, apiFileUrl, apiUpload } from '@/lib/api';
import { getStoredToken } from '@/lib/auth';
import { connectId } from '@/lib/prisma-connect';
import { useAuth } from '@/context/AuthContext';

type Document = {
  id: string;
  name: string;
  fileUrl: string;
  mimeType: string | null;
  version: number;
  createdAt: string;
  account: { name: string } | null;
  deal: { name: string } | null;
  uploadedBy: { firstName: string; lastName: string } | null;
};

type Account = { id: string; name: string };

export default function DocumentsPage() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ name: '', fileUrl: '', accountId: '' });
  const [uploadForm, setUploadForm] = useState({ name: '', accountId: '' });
  const { data, loading, error, reload } = useFetch<Document[]>('/documents');
  const accounts = useFetch<Account[]>('/accounts');

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    await apiFetch('/documents', {
      method: 'POST',
      body: JSON.stringify({
        name: form.name,
        fileUrl: form.fileUrl,
        account: connectId(form.accountId || undefined),
        uploadedBy: connectId(user?.id),
      }),
    });
    setShowModal(false);
    setForm({ name: '', fileUrl: '', accountId: '' });
    await reload();
  }

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      alert('Select a file to upload');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (uploadForm.name) fd.append('name', uploadForm.name);
      if (uploadForm.accountId) fd.append('accountId', uploadForm.accountId);
      await apiUpload('/documents/upload', fd);
      setShowModal(false);
      setUploadForm({ name: '', accountId: '' });
      if (fileRef.current) fileRef.current.value = '';
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function downloadFile(doc: Document) {
    const token = getStoredToken();
    const res = await fetch(apiFileUrl(doc.fileUrl), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      alert('Download failed');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.name;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Documents"
        description="Central library — upload files or link by URL"
        action={
          <button type="button" className={btnPrimary} onClick={() => setShowModal(true)}>
            Add Document
          </button>
        }
      />
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} onRetry={reload} /> : null}
        {!loading && !error && data && data.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Linked To</th>
                <th className="px-6 py-3">Uploaded By</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">{doc.name}</p>
                    <p className="text-xs text-slate-400">v{doc.version} · {doc.mimeType ?? 'file'}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{doc.account?.name ?? doc.deal?.name ?? '—'}</td>
                  <td className="px-6 py-4 text-slate-600">{doc.uploadedBy ? fullName(doc.uploadedBy.firstName, doc.uploadedBy.lastName) : '—'}</td>
                  <td className="px-6 py-4 text-slate-500">{formatDateTime(doc.createdAt)}</td>
                  <td className="px-6 py-4">
                    {doc.fileUrl.startsWith('/api/v1/files/') ? (
                      <button type="button" className="text-sm text-blue-600" onClick={() => downloadFile(doc)}>
                        Download
                      </button>
                    ) : (
                      <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600">Open</a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : !loading && !error ? <p className="px-6 py-12 text-center text-sm text-slate-400">No documents yet.</p> : null}
      </div>
      <Modal open={showModal} title="Add Document" onClose={() => setShowModal(false)}>
        <div className="space-y-6">
          <form onSubmit={handleUpload} className="space-y-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-900">Upload File (max 10 MB)</p>
            <FormField label="File">
              <input ref={fileRef} type="file" required className={inputClass} />
            </FormField>
            <FormField label="Display Name (optional)">
              <input value={uploadForm.name} onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })} className={inputClass} />
            </FormField>
            <FormField label="Account (optional)">
              <select value={uploadForm.accountId} onChange={(e) => setUploadForm({ ...uploadForm, accountId: e.target.value })} className={selectClass}>
                <option value="">None</option>
                {accounts.data?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </FormField>
            <button type="submit" className={btnPrimary} disabled={uploading}>{uploading ? 'Uploading...' : 'Upload'}</button>
          </form>
          <form onSubmit={handleCreate} className="space-y-4">
            <p className="text-sm font-medium text-slate-700">Or link by URL</p>
            <FormField label="Document Name"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} /></FormField>
            <FormField label="File URL / Path"><input required value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} placeholder="/files/datasheet.pdf" className={inputClass} /></FormField>
            <FormField label="Account (optional)">
              <select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })} className={selectClass}>
                <option value="">None</option>
                {accounts.data?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </FormField>
            <div className="flex justify-end gap-3"><button type="button" className={btnSecondary} onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className={btnSecondary}>Save Link</button></div>
          </form>
        </div>
      </Modal>
    </div>
  );
}