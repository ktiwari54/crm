'use client';

import { Fragment, useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { formatCurrency, formatDate } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { apiFetch } from '@/lib/api';

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  total: string;
  account: { name: string };
  quote: { quoteNumber: string } | null;
  shippedAt: string | null;
};

type FalloutTask = {
  id: string;
  taskType: string;
  status: string;
  dueAt: string | null;
  errorMessage: string | null;
  order: { orderNumber: string; account: { name: string } };
};

type FulfillmentTask = {
  id: string;
  taskType: string;
  status: string;
  sortOrder: number;
  dueAt: string | null;
};

export default function OrdersPage() {
  const { data, loading, error, reload } = useFetch<Order[]>('/orders');
  const fallout = useFetch<FalloutTask[]>('/orders/fallout');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [tasks, setTasks] = useState<FulfillmentTask[]>([]);

  async function updateStatus(id: string, status: string) {
    await apiFetch(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    await reload();
  }

  async function createInvoice(orderId: string) {
    try {
      await apiFetch(`/invoices/from-order/${orderId}`, { method: 'POST' });
      alert('Invoice created successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create invoice');
    }
  }

  async function showFulfillment(orderId: string) {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
      return;
    }
    let result = await apiFetch<FulfillmentTask[]>(`/orders/${orderId}/fulfillment`);
    if (result.length === 0) {
      result = await apiFetch<FulfillmentTask[]>(`/orders/${orderId}/fulfillment`, { method: 'POST' });
    }
    setTasks(result);
    setExpandedOrder(orderId);
  }

  async function completeTask(taskId: string, orderId: string) {
    await apiFetch(`/orders/fulfillment/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'completed' }),
    });
    const result = await apiFetch<FulfillmentTask[]>(`/orders/${orderId}/fulfillment`);
    setTasks(result);
    await fallout.reload();
  }

  return (
    <div className="p-8">
      <PageHeader title="Orders" description="Order orchestration with fulfillment plans and fallout alerts" />
      {fallout.data && fallout.data.length > 0 ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="font-medium text-red-900">{fallout.data.length} fulfillment fallout alert(s)</p>
          {fallout.data.map((t) => (
            <p key={t.id} className="mt-1 text-sm text-red-700">
              {t.order.orderNumber} · {t.taskType} · {t.status}
              {t.errorMessage ? ` — ${t.errorMessage}` : ''}
            </p>
          ))}
        </div>
      ) : null}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} onRetry={reload} /> : null}
        {!loading && !error && data && data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3">Order #</th>
                  <th className="px-6 py-3">Account</th>
                  <th className="px-6 py-3">Quote</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Total</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((order) => (
                  <Fragment key={order.id}>
                    <tr className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">{order.orderNumber}</td>
                      <td className="px-6 py-4 text-slate-600">{order.account.name}</td>
                      <td className="px-6 py-4 text-slate-600">{order.quote?.quoteNumber ?? '—'}</td>
                      <td className="px-6 py-4"><Badge variant="blue">{order.status}</Badge></td>
                      <td className="px-6 py-4 font-medium">{formatCurrency(order.total)}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <button type="button" className="text-sm text-blue-600" onClick={() => showFulfillment(order.id)}>Fulfillment</button>
                          {order.status === 'submitted' ? (
                            <button type="button" className="text-sm text-blue-600" onClick={() => updateStatus(order.id, 'confirmed')}>Confirm</button>
                          ) : order.status === 'confirmed' ? (
                            <button type="button" className="text-sm text-blue-600" onClick={() => updateStatus(order.id, 'shipped')}>Ship</button>
                          ) : order.status === 'shipped' || order.status === 'delivered' ? (
                            <button type="button" className="text-sm text-blue-600" onClick={() => createInvoice(order.id)}>Create Invoice</button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                    {expandedOrder === order.id && tasks.length > 0 ? (
                      <tr key={`${order.id}-fulfillment`}>
                        <td colSpan={6} className="bg-slate-50 px-6 py-4">
                          <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Fulfillment Plan</p>
                          <div className="flex flex-wrap gap-2">
                            {tasks.map((t) => (
                              <div key={t.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                                <span className="text-xs font-medium">{t.sortOrder}. {t.taskType}</span>
                                <Badge variant={t.status === 'completed' ? 'green' : t.status === 'failed' ? 'red' : 'yellow'}>{t.status}</Badge>
                                {t.dueAt ? <span className="text-xs text-slate-400">{formatDate(t.dueAt)}</span> : null}
                                {t.status !== 'completed' && t.status !== 'failed' ? (
                                  <button type="button" className="text-xs text-blue-600" onClick={() => completeTask(t.id, order.id)}>Complete</button>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : !loading && !error ? (
          <p className="px-6 py-12 text-center text-sm text-slate-400">No orders yet.</p>
        ) : null}
      </div>
    </div>
  );
}