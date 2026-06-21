'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { connectId } from '@/lib/prisma-connect';
import { useAuth } from '@/context/AuthContext';
import { useFetch } from '@/hooks/useFetch';
import { formatCurrency, formatDateTime, fullName } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import {
  FormField,
  inputClass,
  selectClass,
  btnPrimary,
  btnSecondary,
} from '@/components/ui/FormField';

type PipelineStage = { id: string; name: string; sortOrder: number };
type Pipeline = { id: string; name: string; isDefault: boolean; stages: PipelineStage[] };
type PipelineSummary = { id: string; name: string; isDefault: boolean };

type Deal = {
  id: string;
  name: string;
  amount: string | null;
  probability: number | null;
  forecastCategory: string | null;
  expectedCloseDate: string | null;
  account: { id: string; name: string };
  pipelineStage: { id: string; name: string };
  owner: { firstName: string; lastName: string } | null;
  teamMembers: { user: { firstName: string; lastName: string }; role: string }[];
};

type Inspection = {
  id: string;
  name: string;
  forecastCategory: string | null;
  stageHistory: {
    fromStageId: string | null;
    toStageId: string;
    changedAt: string;
    amount: string | null;
    changedBy: { firstName: string; lastName: string } | null;
  }[];
  teamMembers: {
    id: string;
    role: string;
    revenueSplitPercent: string | null;
    user: { id: string; firstName: string; lastName: string };
  }[];
  quotes: { quoteNumber: string; status: string; total: string }[];
};

type FieldChange = {
  id: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: string;
  changedBy: { firstName: string; lastName: string } | null;
};

type FeedPost = {
  id: string;
  body: string;
  createdAt: string;
  author: { firstName: string; lastName: string };
};

type Account = { id: string; name: string };
type User = { id: string; firstName: string; lastName: string };

type Playbook = {
  id: string;
  name: string;
  steps: { stepNumber: number; title: string; question: string | null; action: string | null }[];
};

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  amount: 'Amount',
  probability: 'Probability',
  forecastCategory: 'Forecast Category',
  expectedCloseDate: 'Expected Close',
};

export default function DealsPage() {
  const { user } = useAuth();
  const [pipelineId, setPipelineId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [inspectId, setInspectId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [moving, setMoving] = useState<string | null>(null);
  const [teamUserId, setTeamUserId] = useState('');
  const [chatterBody, setChatterBody] = useState('');
  const [form, setForm] = useState({
    name: '',
    accountId: '',
    stageId: '',
    amount: '',
    expectedCloseDate: '',
  });

  const pipelines = useFetch<PipelineSummary[]>('/pipelines');
  const pipeline = useFetch<Pipeline>(
    pipelineId ? `/deals/pipeline?pipelineId=${pipelineId}` : null,
    [pipelineId],
  );
  const deals = useFetch<Deal[]>(
    pipelineId ? `/deals?pipelineId=${pipelineId}` : null,
    [pipelineId],
  );
  const dealScores = useFetch<{ dealId: string; winScore: number; label: string }[]>(
    pipelineId ? `/ai/deal-scores?pipelineId=${pipelineId}` : null,
    [pipelineId],
  );
  const scoreMap = Object.fromEntries((dealScores.data ?? []).map((s) => [s.dealId, s]));
  const accounts = useFetch<Account[]>('/accounts');
  const users = useFetch<User[]>('/users');
  const inspection = useFetch<Inspection>(
    inspectId ? `/deals/${inspectId}/inspection` : null,
    [inspectId],
  );
  const fieldHistory = useFetch<FieldChange[]>(
    inspectId ? `/field-history?entityType=deal&entityId=${inspectId}` : null,
    [inspectId],
  );
  const dealChatter = useFetch<FeedPost[]>(
    inspectId ? `/chatter?entityType=deal&entityId=${inspectId}` : null,
    [inspectId],
  );
  const playbook = useFetch<Playbook | null>(
    inspectId ? `/deals/${inspectId}/playbook` : null,
    [inspectId],
  );

  useEffect(() => {
    if (pipelines.data && !pipelineId) {
      const def = pipelines.data.find((p) => p.isDefault) ?? pipelines.data[0];
      if (def) setPipelineId(def.id);
    }
  }, [pipelines.data, pipelineId]);

  const stages = pipeline.data?.stages ?? [];
  const stageName = (id: string | null) =>
    stages.find((s) => s.id === id)?.name ?? '—';

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/deals', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          amount: form.amount ? Number(form.amount) : undefined,
          expectedCloseDate: form.expectedCloseDate || undefined,
          account: connectId(form.accountId),
          pipelineStage: connectId(form.stageId || stages[0]?.id),
          owner: connectId(user?.id),
        }),
      });
      setShowModal(false);
      setForm({ name: '', accountId: '', stageId: '', amount: '', expectedCloseDate: '' });
      await deals.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create deal');
    } finally {
      setSaving(false);
    }
  }

  async function moveDeal(dealId: string, stageId: string) {
    setMoving(dealId);
    try {
      await apiFetch(`/deals/${dealId}`, {
        method: 'PATCH',
        body: JSON.stringify({ pipelineStage: connectId(stageId) }),
      });
      await deals.reload();
      if (inspectId === dealId) {
        await inspection.reload();
        await fieldHistory.reload();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to move deal');
    } finally {
      setMoving(null);
    }
  }

  async function updateForecast(dealId: string, category: string) {
    await apiFetch(`/deals/${dealId}`, {
      method: 'PATCH',
      body: JSON.stringify({ forecastCategory: category }),
    });
    await deals.reload();
    if (inspectId === dealId) {
      await inspection.reload();
      await fieldHistory.reload();
    }
  }

  async function addTeamMember(dealId: string) {
    if (!teamUserId) return;
    await apiFetch(`/deals/${dealId}/team`, {
      method: 'POST',
      body: JSON.stringify({ userId: teamUserId, role: 'sales_rep' }),
    });
    setTeamUserId('');
    await inspection.reload();
    await deals.reload();
  }

  async function postChatter(dealId: string) {
    if (!chatterBody.trim()) return;
    await apiFetch('/chatter', {
      method: 'POST',
      body: JSON.stringify({
        body: chatterBody.trim(),
        entityType: 'deal',
        entityId: dealId,
      }),
    });
    setChatterBody('');
    await dealChatter.reload();
  }

  const loading = pipelines.loading || pipeline.loading || deals.loading;
  const error = pipelines.error || pipeline.error || deals.error;

  return (
    <div className="p-8">
      <PageHeader
        title="Deals"
        description="Multiple pipelines — kanban, inspection, teams, and field history"
        action={
          <button type="button" className={btnPrimary} onClick={() => setShowModal(true)}>
            New Deal
          </button>
        }
      />

      {pipelines.data && pipelines.data.length > 0 ? (
        <div className="mb-6 flex flex-wrap gap-2">
          {pipelines.data.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPipelineId(p.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                pipelineId === p.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              {p.name}
              {p.isDefault ? <span className="ml-1 text-xs opacity-75">(default)</span> : null}
            </button>
          ))}
        </div>
      ) : null}

      {loading ? <LoadingState /> : null}
      {error ? (
        <ErrorState
          message={error}
          onRetry={() => {
            void pipelines.reload();
            void pipeline.reload();
            void deals.reload();
          }}
        />
      ) : null}

      {!loading && !error ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const stageDeals = deals.data?.filter((d) => d.pipelineStage.id === stage.id) ?? [];
            return (
              <div key={stage.id} className="min-w-[260px] flex-shrink-0 rounded-xl border border-slate-200 bg-slate-100 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">{stage.name}</h3>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">{stageDeals.length}</span>
                </div>
                <div className="space-y-3">
                  {stageDeals.map((deal) => (
                    <div key={deal.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                      <button type="button" className="text-left" onClick={() => setInspectId(deal.id)}>
                        <p className="text-sm font-medium text-blue-600 hover:text-blue-700">{deal.name}</p>
                      </button>
                      <p className="mt-1 text-xs text-slate-500">{deal.account.name}</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{formatCurrency(deal.amount)}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {scoreMap[deal.id] ? (
                          <Badge variant={scoreMap[deal.id].label === 'high' ? 'green' : scoreMap[deal.id].label === 'low' ? 'red' : 'yellow'}>
                            AI {scoreMap[deal.id].winScore}%
                          </Badge>
                        ) : null}
                        {deal.forecastCategory ? (
                          <Badge variant="purple">{deal.forecastCategory.replace('_', ' ')}</Badge>
                        ) : null}
                      </div>
                      {deal.teamMembers.length > 0 ? (
                        <p className="mt-1 text-xs text-slate-400">{deal.teamMembers.length} team member(s)</p>
                      ) : null}
                      <select
                        className="mt-3 w-full rounded border border-slate-200 px-2 py-1 text-xs"
                        value={deal.pipelineStage.id}
                        disabled={moving === deal.id}
                        onChange={(e) => moveDeal(deal.id, e.target.value)}
                      >
                        {stages.map((s) => (
                          <option key={s.id} value={s.id}>Move to {s.name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                  {stageDeals.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">No deals</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <Modal open={!!inspectId} title="Deal Inspection" onClose={() => setInspectId(null)}>
        {inspection.loading ? <LoadingState /> : null}
        {inspection.data ? (
          <div className="max-h-[70vh] space-y-6 overflow-y-auto">
            <div>
              <h3 className="font-semibold text-slate-900">{inspection.data.name}</h3>
              <FormField label="Forecast Category">
                <select
                  value={inspection.data.forecastCategory ?? 'pipeline'}
                  onChange={(e) => inspectId && updateForecast(inspectId, e.target.value)}
                  className={selectClass}
                >
                  <option value="pipeline">Pipeline</option>
                  <option value="best_case">Best Case</option>
                  <option value="commit">Commit</option>
                  <option value="omitted">Omitted</option>
                </select>
              </FormField>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-700">Stage History</h4>
              {inspection.data.stageHistory.length === 0 ? (
                <p className="text-xs text-slate-400">No stage changes yet. Move the deal to record history.</p>
              ) : (
                <div className="space-y-2">
                  {inspection.data.stageHistory.map((h, i) => (
                    <div key={i} className="rounded-lg bg-slate-50 px-3 py-2 text-xs">
                      {stageName(h.fromStageId)} → {stageName(h.toStageId)}
                      <span className="ml-2 text-slate-400">{formatDateTime(h.changedAt)}</span>
                      {h.changedBy ? (
                        <span className="ml-2 text-slate-500">
                          by {fullName(h.changedBy.firstName, h.changedBy.lastName)}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-700">Field History</h4>
              {fieldHistory.loading ? <p className="text-xs text-slate-400">Loading...</p> : null}
              {fieldHistory.data && fieldHistory.data.length > 0 ? (
                <div className="space-y-2">
                  {fieldHistory.data.map((h) => (
                    <div key={h.id} className="rounded-lg bg-slate-50 px-3 py-2 text-xs">
                      <span className="font-medium">{FIELD_LABELS[h.fieldName] ?? h.fieldName}</span>
                      {' '}{h.oldValue ?? '—'} → {h.newValue ?? '—'}
                      <span className="ml-2 text-slate-400">{formatDateTime(h.changedAt)}</span>
                      {h.changedBy ? (
                        <span className="ml-2 text-slate-500">
                          by {fullName(h.changedBy.firstName, h.changedBy.lastName)}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No field changes recorded yet.</p>
              )}
            </div>

            {playbook.data ? (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-700">Guided Selling Playbook</h4>
                <p className="mb-2 text-sm font-medium text-blue-700">{playbook.data.name}</p>
                <div className="space-y-2">
                  {playbook.data.steps.map((step) => (
                    <div key={step.stepNumber} className="rounded-lg bg-green-50 px-3 py-2 text-xs">
                      <span className="font-medium">{step.stepNumber}. {step.title}</span>
                      {step.question ? <p className="mt-1 text-slate-600">{step.question}</p> : null}
                      {step.action ? <p className="mt-1 text-green-700">→ {step.action}</p> : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-700">Chatter</h4>
              <div className="space-y-2">
                {dealChatter.data?.map((post) => (
                  <div key={post.id} className="rounded-lg bg-blue-50 px-3 py-2 text-xs">
                    <span className="font-medium">
                      {fullName(post.author.firstName, post.author.lastName)}
                    </span>
                    <span className="ml-2 text-slate-400">{formatDateTime(post.createdAt)}</span>
                    <p className="mt-1 text-slate-700">{post.body}</p>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={chatterBody}
                  onChange={(e) => setChatterBody(e.target.value)}
                  placeholder="Post an update on this deal..."
                  className={inputClass}
                />
                <button
                  type="button"
                  className={btnSecondary}
                  onClick={() => inspectId && postChatter(inspectId)}
                >
                  Post
                </button>
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-700">Opportunity Team</h4>
              {inspection.data.teamMembers.map((m) => (
                <p key={m.id} className="text-sm text-slate-600">
                  {m.user.firstName} {m.user.lastName} — {m.role.replace('_', ' ')}
                </p>
              ))}
              <div className="mt-2 flex gap-2">
                <select value={teamUserId} onChange={(e) => setTeamUserId(e.target.value)} className={selectClass}>
                  <option value="">Add team member...</option>
                  {users.data?.map((u) => (
                    <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                  ))}
                </select>
                <button type="button" className={btnSecondary} onClick={() => inspectId && addTeamMember(inspectId)}>Add</button>
              </div>
            </div>

            {inspection.data.quotes.length > 0 ? (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-700">Quotes</h4>
                {inspection.data.quotes.map((q, i) => (
                  <p key={i} className="text-sm text-slate-600">{q.quoteNumber} — {q.status} — {formatCurrency(q.total)}</p>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal open={showModal} title="New Deal" onClose={() => setShowModal(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          <FormField label="Deal Name"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} /></FormField>
          <FormField label="Account">
            <select required value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })} className={selectClass}>
              <option value="">Select account...</option>
              {accounts.data?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </FormField>
          <FormField label="Stage">
            <select value={form.stageId} onChange={(e) => setForm({ ...form, stageId: e.target.value })} className={selectClass}>
              {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </FormField>
          <FormField label="Amount"><input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputClass} /></FormField>
          <FormField label="Expected Close Date"><input type="date" value={form.expectedCloseDate} onChange={(e) => setForm({ ...form, expectedCloseDate: e.target.value })} className={inputClass} /></FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className={btnSecondary} onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className={btnPrimary} disabled={saving}>{saving ? 'Creating...' : 'Create Deal'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}