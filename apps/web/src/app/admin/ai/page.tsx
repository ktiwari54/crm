'use client';

import { useFetch } from '@/hooks/useFetch';
import { formatDate } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';

type AiSettings = {
  piiMaskingEnabled: boolean;
  llmConfigured: boolean;
  model: string;
  auditRetentionDays: number;
  maskedFields: string[];
};

type AuditEntry = {
  id: string;
  action: string;
  entityType: string | null;
  piiMasked: boolean;
  promptPreview: string | null;
  model: string | null;
  createdAt: string;
  user: { firstName: string; lastName: string } | null;
};

export default function AdminAiPage() {
  const settings = useFetch<AiSettings>('/ai/settings');
  const audit = useFetch<AuditEntry[]>('/ai/audit');

  return (
    <div className="p-8">
      <PageHeader
        title="AI Trust Layer"
        description="PII masking, model configuration, and inference audit log"
      />

      {settings.loading ? <LoadingState /> : null}
      {settings.data ? (
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">PII Masking</p>
            <p className="mt-2 text-lg font-bold text-slate-900">
              {settings.data.piiMaskingEnabled ? 'Enabled' : 'Disabled'}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">LLM Provider</p>
            <p className="mt-2 text-lg font-bold text-slate-900">
              {settings.data.llmConfigured ? 'Configured' : 'Rule-based fallback'}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">Model</p>
            <p className="mt-2 text-lg font-bold text-slate-900">{settings.data.model}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">Retention</p>
            <p className="mt-2 text-lg font-bold text-slate-900">{settings.data.auditRetentionDays} days</p>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="font-semibold text-slate-900">Audit Log</h2>
          <p className="text-xs text-slate-500">All AI prompts are masked before logging</p>
        </div>
        {audit.loading ? <LoadingState /> : null}
        {audit.error ? <ErrorState message={audit.error} onRetry={audit.reload} /> : null}
        {!audit.loading && !audit.error && audit.data && audit.data.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3">Time</th>
                <th className="px-6 py-3">Action</th>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Model</th>
                <th className="px-6 py-3">PII Masked</th>
                <th className="px-6 py-3">Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {audit.data.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">{formatDate(entry.createdAt)}</td>
                  <td className="px-6 py-4">
                    <Badge variant="blue">{entry.action}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    {entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : '—'}
                  </td>
                  <td className="px-6 py-4 text-xs">{entry.model ?? '—'}</td>
                  <td className="px-6 py-4">
                    <Badge variant={entry.piiMasked ? 'green' : 'yellow'}>
                      {entry.piiMasked ? 'yes' : 'no'}
                    </Badge>
                  </td>
                  <td className="max-w-xs truncate px-6 py-4 font-mono text-xs text-slate-500">
                    {entry.promptPreview ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        {!audit.loading && !audit.error && audit.data?.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-slate-500">No audit entries yet.</p>
        ) : null}
      </div>
    </div>
  );
}