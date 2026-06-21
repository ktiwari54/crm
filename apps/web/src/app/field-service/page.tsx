'use client';

import { useFetch } from '@/hooks/useFetch';
import { formatDate } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';

type WorkOrder = {
  id: string;
  workOrderNumber: string;
  title: string;
  description: string | null;
  status: string;
  scheduledAt: string | null;
  serviceAddress: string | null;
  account: { name: string };
  asset: { serialNumber: string; product: { sku: string } } | null;
  technician: { firstName: string; lastName: string } | null;
};

const statusVariant: Record<string, 'green' | 'blue' | 'yellow' | 'default'> = {
  completed: 'green',
  in_progress: 'blue',
  scheduled: 'yellow',
  cancelled: 'default',
};

export default function FieldServicePage() {
  const { data, loading, error, reload } = useFetch<WorkOrder[]>('/field-service/work-orders');

  const grouped = (data ?? []).reduce<Record<string, WorkOrder[]>>((acc, wo) => {
    const day = wo.scheduledAt ? new Date(wo.scheduledAt).toLocaleDateString() : 'Unscheduled';
    acc[day] = acc[day] ?? [];
    acc[day].push(wo);
    return acc;
  }, {});

  return (
    <div className="p-8">
      <PageHeader title="Field Service" description="Work orders, technician assignments, and visit schedule" />

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={reload} /> : null}

      {data ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            {[
              ['Total', data.length],
              ['Scheduled', data.filter((w) => w.status === 'scheduled').length],
              ['In Progress', data.filter((w) => w.status === 'in_progress').length],
              ['Completed', data.filter((w) => w.status === 'completed').length],
            ].map(([label, count]) => (
              <div key={label as string} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase text-slate-500">{label as string}</p>
                <p className="mt-1 text-xl font-bold">{count as number}</p>
              </div>
            ))}
          </div>

          {Object.entries(grouped).map(([day, orders]) => (
            <div key={day} className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <p className="border-b border-slate-100 px-6 py-3 font-semibold text-slate-800">{day}</p>
              <div className="divide-y divide-slate-100">
                {orders.map((wo) => (
                  <div key={wo.id} className="flex items-start gap-4 px-6 py-4">
                    <div className="w-20 text-center">
                      {wo.scheduledAt ? (
                        <p className="text-sm font-medium text-slate-700">
                          {new Date(wo.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400">TBD</p>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{wo.title}</p>
                        <Badge variant={statusVariant[wo.status] ?? 'default'}>{wo.status}</Badge>
                      </div>
                      <p className="text-sm text-slate-500">{wo.workOrderNumber} · {wo.account.name}</p>
                      {wo.asset ? (
                        <p className="text-xs text-slate-400">Asset: {wo.asset.serialNumber} ({wo.asset.product.sku})</p>
                      ) : null}
                      {wo.technician ? (
                        <p className="text-xs text-slate-400">Tech: {wo.technician.firstName} {wo.technician.lastName}</p>
                      ) : null}
                      {wo.serviceAddress ? <p className="text-xs text-slate-400">{wo.serviceAddress}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {data.length === 0 ? (
            <p className="text-center text-sm text-slate-400">No work orders scheduled</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}