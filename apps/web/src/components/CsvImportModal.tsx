'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { inputClass, btnPrimary, btnSecondary } from '@/components/ui/FormField';

type ImportResult = { imported: number; failed: number; errors: { row: number; message: string }[] };

/**
 * Generic CSV importer. POSTs { csv } to `endpoint` and shows the result.
 * `sampleCsv` powers both the textarea default and the "Download sample" button.
 */
export function CsvImportModal({
  endpoint,
  title,
  hint,
  sampleCsv,
  sampleName,
  onClose,
  onDone,
}: {
  endpoint: string;
  title: string;
  hint: string;
  sampleCsv: string;
  sampleName: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [csv, setCsv] = useState(sampleCsv);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const res = await apiFetch<ImportResult>(endpoint, { method: 'POST', body: JSON.stringify({ csv }) });
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

  function downloadSample() {
    const blob = new Blob([sampleCsv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = sampleName;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Modal open title={title} onClose={onClose}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">{hint}</p>
          <button type="button" className="shrink-0 text-xs font-medium text-blue-600 hover:underline" onClick={downloadSample}>
            ↓ Download sample
          </button>
        </div>
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

export const SAMPLE_LEADS_CSV =
  'companyName,firstName,lastName,email,phone,title,source\n' +
  'Acme Corp,Jane,Doe,jane@acme.com,+15551234567,CTO,referral\n' +
  'Beta Industries,Sam,Lee,sam@beta.com,+15557654321,Procurement Manager,web\n';

export const SAMPLE_ACCOUNTS_CSV =
  'name,accountType,industry,country,email,phone,website,vatNumber,gstNumber,tradeLicenseNumber,paymentTerms\n' +
  'Acme Corp,customer,Electronics,AE,info@acme.com,+97142223333,https://acme.com,VAT123456,GST7890,TL-2024-001,Net 30\n' +
  'Globex LLC,prospect,Distribution,US,sales@globex.com,+12125550000,https://globex.com,,,,Net 45\n';

export const SAMPLE_CONTACTS_CSV =
  'firstName,lastName,accountName,email,phone,mobile,title,country\n' +
  'Jane,Doe,Acme Corp,jane@acme.com,+97142223333,+971501112222,CTO,AE\n' +
  'John,Smith,Globex LLC,john@globex.com,+12125550000,+12125559999,Buyer,US\n';
