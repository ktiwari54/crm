'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { apiFetch } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import {
  FormField,
  inputClass,
  selectClass,
  btnPrimary,
  btnSecondary,
} from '@/components/ui/FormField';

type PipelineSummary = { id: string; name: string; isDefault: boolean };
type Stage = { id: string; name: string; sortOrder: number; defaultProbability: number };
type BlueprintRule = { id: string; name: string; requirement: string; message: string | null };

type FlowData = {
  pipeline: { id: string; name: string; stages: Stage[] };
  rulesByStage: Record<string, BlueprintRule[]>;
};

const REQUIREMENTS = [
  { value: 'quote_sent', label: 'Quote must be sent' },
  { value: 'quote_approved', label: 'Quote must be approved' },
  { value: 'min_amount', label: 'Minimum deal amount' },
];

export default function FlowBuilderPage() {
  const [pipelineId, setPipelineId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    pipelineStageId: '',
    requirement: 'quote_sent',
    message: '',
  });

  const pipelines = useFetch<PipelineSummary[]>('/pipelines');
  const flow = useFetch<FlowData>(
    pipelineId ? `/blueprints/flow/${pipelineId}` : null,
    [pipelineId],
  );

  useEffect(() => {
    if (pipelines.data && !pipelineId) {
      const def = pipelines.data.find((p) => p.isDefault) ?? pipelines.data[0];
      if (def) setPipelineId(def.id);
    }
  }, [pipelines.data, pipelineId]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/blueprints', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          entityType: 'deal',
          pipelineStageId: form.pipelineStageId,
          requirement: form.requirement,
          message: form.message || undefined,
        }),
      });
      setShowModal(false);
      setForm({ name: '', pipelineStageId: '', requirement: 'quote_sent', message: '' });
      await flow.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create rule');
    } finally {
      setSaving(false);
    }
  }

  const loading = pipelines.loading || flow.loading;
  const error = pipelines.error || flow.error;
  const stages = flow.data?.pipeline.stages ?? [];

  return (
    <div className="p-8">
      <PageHeader
        title="Flow Builder"
        description="Visual pipeline blueprint — stage gates and mandatory steps"
        action={
          <button type="button" className={btnPrimary} onClick={() => setShowModal(true)}>
            Add Stage Gate
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
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                pipelineId === p.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      ) : null}

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={() => { void pipelines.reload(); void flow.reload(); }} /> : null}

      {!loading && !error && flow.data ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-lg font-semibold text-slate-900">{flow.data.pipeline.name}</h2>
          <div className="flex min-w-max items-start gap-2">
            {stages.map((stage, i) => {
              const rules = flow.data!.rulesByStage[stage.id] ?? [];
              return (
                <div key={stage.id} className="flex items-start gap-2">
                  <div className="w-44 flex-shrink-0">
                    <div className="rounded-xl border-2 border-blue-200 bg-blue-50 px-4 py-3 text-center">
                      <p className="text-sm font-semibold text-slate-900">{stage.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{stage.defaultProbability}%</p>
                    </div>
                    {rules.length > 0 ? (
                      <div className="mt-2 space-y-1">
                        {rules.map((rule) => (
                          <div
                            key={rule.id}
                            className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-1.5 text-xs text-amber-900"
                            title={rule.message ?? undefined}
                          >
                            🔒 {rule.name}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {i < stages.length - 1 ? (
                    <div className="mt-6 flex-shrink-0 text-slate-300">→</div>
                  ) : null}
                </div>
              );
            })}
          </div>
          <p className="mt-8 text-xs text-slate-400">
            Amber locks are blueprint gates — deals cannot enter that stage until requirements pass.
          </p>
        </div>
      ) : null}

      <Modal open={showModal} title="Add Stage Gate" onClose={() => setShowModal(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          <FormField label="Rule Name">
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
          </FormField>
          <FormField label="Target Stage">
            <select
              required
              value={form.pipelineStageId}
              onChange={(e) => setForm({ ...form, pipelineStageId: e.target.value })}
              className={selectClass}
            >
              <option value="">Select stage...</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Requirement">
            <select
              value={form.requirement}
              onChange={(e) => setForm({ ...form, requirement: e.target.value })}
              className={selectClass}
            >
              {REQUIREMENTS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Error Message (optional)">
            <input value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className={inputClass} />
          </FormField>
          <div className="flex justify-end gap-3">
            <button type="button" className={btnSecondary} onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className={btnPrimary} disabled={saving}>{saving ? 'Saving...' : 'Create Gate'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}