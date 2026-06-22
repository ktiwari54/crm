'use client';

import { useState } from 'react';
import { apiFetch, apiUpload, apiFileUrl } from '@/lib/api';
import { useFetch } from '@/hooks/useFetch';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { FormField, inputClass, selectClass, btnPrimary, btnSecondary } from '@/components/ui/FormField';

type Doc = {
  id: string;
  name: string;
  docType: string | null;
  fileUrl: string;
  mimeType: string | null;
  createdAt: string;
  uploadedBy: { firstName: string; lastName: string } | null;
};

const DOC_TYPES = ['Trade License', 'GST Document', 'Tax Document', 'VAT Certificate', 'Contract', 'ID / Owner ID', 'Other'];

/**
 * View + upload documents for any entity.
 * `entityType` is one of: account | lead | contact | deal | quote | contract.
 */
export function DocumentsPanel({
  entityType,
  entityId,
  title,
  onClose,
}: {
  entityType: string;
  entityId: string;
  title: string;
  onClose: () => void;
}) {
  const { data, loading, reload } = useFetch<Doc[]>(`/documents?entityType=${entityType}&entityId=${entityId}`);
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('Trade License');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const idField = `${entityType}Id`; // accountId | leadId | contactId | dealId ...

  async function upload() {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('docType', docType);
      fd.append('name', name || `${docType} — ${title}`);
      fd.append(idField, entityId);
      await apiUpload('/documents/upload', fd);
      setFile(null);
      setName('');
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this document?')) return;
    try {
      await apiFetch(`/documents/${id}`, { method: 'DELETE' });
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <Modal open title={`Documents — ${title}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="space-y-2 rounded-lg border border-slate-200 p-3">
          <div className="grid grid-cols-2 gap-2">
            <FormField label="Document type">
              <select className={selectClass} value={docType} onChange={(e) => setDocType(e.target.value)}>
                {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </FormField>
            <FormField label="Label (optional)">
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="defaults to type + name" />
            </FormField>
          </div>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
          <div className="flex justify-end">
            <button type="button" className={btnPrimary} onClick={upload} disabled={busy || !file}>{busy ? 'Uploading…' : 'Upload'}</button>
          </div>
        </div>

        {loading ? <LoadingState /> : null}
        {data && data.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">No documents yet.</p> : null}
        {data && data.length > 0 ? (
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {data.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <a href={apiFileUrl(d.fileUrl)} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">
                    {d.name}
                  </a>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                    {d.docType ? <Badge variant="blue">{d.docType}</Badge> : null}
                    <span>{new Date(d.createdAt).toLocaleDateString()}</span>
                    {d.uploadedBy ? <span>· {d.uploadedBy.firstName} {d.uploadedBy.lastName}</span> : null}
                  </div>
                </div>
                <button type="button" className="text-xs font-medium text-red-600 hover:underline" onClick={() => remove(d.id)}>Delete</button>
              </div>
            ))}
          </div>
        ) : null}
        <div className="flex justify-end">
          <button type="button" className={btnSecondary} onClick={onClose}>Close</button>
        </div>
      </div>
    </Modal>
  );
}
