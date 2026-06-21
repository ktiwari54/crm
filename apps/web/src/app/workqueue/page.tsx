'use client';

import { useFetch } from '@/hooks/useFetch';
import { formatCurrency, formatDateTime, fullName } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';

type Activity = {
  id: string;
  activityType: string;
  subject: string;
  dueAt: string | null;
  priority: string;
  owner: { firstName: string; lastName: string } | null;
};

type Deal = {
  id: string;
  name: string;
  amount: string | null;
  account: { name: string };
  pipelineStage: { name: string };
  owner: { firstName: string; lastName: string } | null;
};

type Workqueue = {
  todayTasks: Activity[];
  overdueTasks: Activity[];
  staleDeals: Deal[];
  summary: {
    todayCount: number;
    overdueCount: number;
    staleDealsCount: number;
  };
};

export default function WorkqueuePage() {
  const { data, loading, error, reload } = useFetch<Workqueue>('/workqueue');

  return (
    <div className="p-8">
      <PageHeader
        title="Workqueue"
        description="Today's prioritized tasks, overdue items, and stale deals"
      />

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={reload} /> : null}

      {!loading && !error && data ? (
        <>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryCard label="Due Today" count={data.summary.todayCount} variant="blue" />
            <SummaryCard label="Overdue" count={data.summary.overdueCount} variant="red" />
            <SummaryCard label="Stale Deals (14d+)" count={data.summary.staleDealsCount} variant="yellow" />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <QueueSection title="Due Today" items={data.todayTasks} type="activity" />
            <QueueSection title="Overdue" items={data.overdueTasks} type="activity" />
            <QueueSection title="Stale Deals" items={data.staleDeals} type="deal" />
          </div>
        </>
      ) : null}
    </div>
  );
}

function SummaryCard({
  label,
  count,
  variant,
}: {
  label: string;
  count: number;
  variant: 'blue' | 'red' | 'yellow';
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900">{count}</p>
      <div className="mt-2">
        <Badge variant={variant}>{count === 0 ? 'All clear' : 'Needs attention'}</Badge>
      </div>
    </div>
  );
}

function QueueSection({
  title,
  items,
  type,
}: {
  title: string;
  items: Activity[] | Deal[];
  type: 'activity' | 'deal';
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="font-semibold text-slate-900">{title}</h2>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-8 text-sm text-slate-400">Nothing here</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {type === 'activity'
            ? (items as Activity[]).map((item) => (
                <div key={item.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{item.subject}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.activityType} · {formatDateTime(item.dueAt)}
                      </p>
                    </div>
                    <Badge variant={item.priority === 'high' ? 'red' : 'default'}>
                      {item.priority}
                    </Badge>
                  </div>
                </div>
              ))
            : (items as Deal[]).map((deal) => (
                <div key={deal.id} className="px-5 py-4">
                  <p className="text-sm font-medium text-slate-900">{deal.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{deal.account.name}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {deal.pipelineStage.name} · {formatCurrency(deal.amount)}
                  </p>
                </div>
              ))}
        </div>
      )}
    </div>
  );
}