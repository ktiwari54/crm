'use client';

import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { FormField, inputClass, btnPrimary, btnSecondary } from '@/components/ui/FormField';
import { apiFetch } from '@/lib/api';

type Template = { id: string; name: string; subject: string; body: string; category: string | null };
type LoggedEmail = { id: string; subject: string | null; bodyPreview: string | null; sentAt: string | null; toAddresses: string[] | null };
type InboxEmail = { id: string; subject: string | null; bodyPreview: string | null; fromAddress: string | null; sentAt: string | null };
type MailboxStatus = { provider: string; configured: boolean; message: string; lastSyncAt: string | null };
type Draft = { subject: string; body: string; source: string; llmAvailable: boolean; templateName: string };

export default function EmailsPage() {
  const templates = useFetch<Template[]>('/emails/templates');
  const logged = useFetch<LoggedEmail[]>('/emails');
  const inbox = useFetch<InboxEmail[]>('/emails/inbox');
  const mailbox = useFetch<MailboxStatus>('/emails/mailbox/status');
  const [syncing, setSyncing] = useState(false);
  const [selected, setSelected] = useState('');
  const [to, setTo] = useState('');
  const [contactName, setContactName] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [sending, setSending] = useState(false);
  const [drafting, setDrafting] = useState(false);

  async function generateDraft() {
    if (!selected) return;
    setDrafting(true);
    try {
      const result = await apiFetch<Draft>('/emails/draft', {
        method: 'POST',
        body: JSON.stringify({ templateId: selected, contactName: contactName || undefined }),
      });
      setDraft(result);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Draft failed');
    } finally {
      setDrafting(false);
    }
  }

  async function syncInbox() {
    setSyncing(true);
    try {
      await apiFetch('/emails/sync', { method: 'POST', body: '{}' });
      await inbox.reload();
      await mailbox.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  async function send() {
    if (!selected || !to) return;
    setSending(true);
    try {
      await apiFetch('/emails/send', {
        method: 'POST',
        body: JSON.stringify({ templateId: selected, toAddresses: [to] }),
      });
      await logged.reload();
      setTo('');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="p-8">
      <PageHeader title="Email Hub" description="Sales email templates, AI drafts, and activity logging" />
      <div className="mb-6 grid gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-4">
        <FormField label="Template">
          <select className={inputClass} value={selected} onChange={(e) => { setSelected(e.target.value); setDraft(null); }}>
            <option value="">Select template</option>
            {templates.data?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </FormField>
        <FormField label="Contact name">
          <input className={inputClass} value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Sarah Chen" />
        </FormField>
        <FormField label="To">
          <input className={inputClass} value={to} onChange={(e) => setTo(e.target.value)} placeholder="contact@account.com" />
        </FormField>
        <div className="flex items-end gap-2">
          <button type="button" className={btnSecondary} onClick={generateDraft} disabled={drafting || !selected}>
            {drafting ? 'Drafting...' : 'AI Draft'}
          </button>
          <button type="button" className={btnPrimary} onClick={send} disabled={sending || !selected || !to}>Send & Log</button>
        </div>
      </div>

      {draft ? (
        <div className="mb-6 rounded-xl border border-purple-200 bg-purple-50 p-4 text-sm">
          <div className="mb-2 flex items-center gap-2">
            <p className="font-medium text-purple-900">AI Draft — {draft.templateName}</p>
            <Badge variant={draft.source === 'llm' ? 'purple' : 'default'}>{draft.source}</Badge>
            {!draft.llmAvailable ? <span className="text-xs text-purple-600">(rule-based — set LLM_API_KEY for LLM)</span> : null}
          </div>
          <p className="font-medium text-purple-800">Subject: {draft.subject}</p>
          <p className="mt-2 whitespace-pre-wrap text-purple-800">{draft.body}</p>
        </div>
      ) : selected && templates.data ? (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm">
          <p className="font-medium text-blue-900">{templates.data.find((t) => t.id === selected)?.subject}</p>
          <p className="mt-2 whitespace-pre-wrap text-blue-800">{templates.data.find((t) => t.id === selected)?.body}</p>
        </div>
      ) : null}

      <div className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-3">
          <div>
            <p className="text-sm font-semibold">Inbox</p>
            {mailbox.data ? (
              <p className="text-xs text-slate-500">
                {mailbox.data.provider.toUpperCase()} — {mailbox.data.message}
              </p>
            ) : null}
          </div>
          <button type="button" className={btnSecondary} onClick={syncInbox} disabled={syncing}>
            {syncing ? 'Syncing...' : 'Sync Inbox'}
          </button>
        </div>
        {inbox.loading ? <LoadingState /> : null}
        {inbox.data?.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-slate-500">No inbox messages — click Sync Inbox</p>
        ) : null}
        {inbox.data?.map((e) => (
          <div key={e.id} className="border-b border-slate-100 px-6 py-4 last:border-0">
            <p className="font-medium text-sm">{e.subject}</p>
            <p className="text-xs text-slate-500">From: {e.fromAddress ?? '—'}</p>
            {e.bodyPreview ? <p className="mt-1 text-xs text-slate-600">{e.bodyPreview}</p> : null}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <p className="border-b border-slate-200 px-6 py-3 text-sm font-semibold">Logged Emails</p>
        {logged.loading ? <LoadingState /> : null}
        {logged.error ? <ErrorState message={logged.error} onRetry={logged.reload} /> : null}
        {logged.data?.map((e) => (
          <div key={e.id} className="border-b border-slate-100 px-6 py-4 last:border-0">
            <p className="font-medium text-sm">{e.subject}</p>
            <p className="text-xs text-slate-500">To: {(e.toAddresses as string[] | null)?.join(', ') ?? '—'} · {e.sentAt ? new Date(e.sentAt).toLocaleString() : ''}</p>
            {e.bodyPreview ? <p className="mt-1 text-xs text-slate-600">{e.bodyPreview}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}