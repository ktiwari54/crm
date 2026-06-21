'use client';

import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { formatDate } from '@/lib/format';
import { apiFetch } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { FormField, inputClass, btnPrimary } from '@/components/ui/FormField';

type Asset = {
  id: string;
  serialNumber: string;
  lotNumber: string | null;
  imei: string | null;
  macAddress: string | null;
  status: string;
  installDate: string | null;
  warrantyEndDate: string | null;
  product: { sku: string; name: string };
  account: { name: string };
  order: { orderNumber: string } | null;
};

type TraceResult = {
  asset: Asset;
  product: { sku: string; name: string; isEol: boolean };
  account: { name: string };
  order: { orderNumber: string; status: string } | null;
  traceChain: { step: string; date: string | null; ref: string | null }[];
  serviceHistory: {
    cases: { caseNumber: string; subject: string; status: string }[];
    rmaRequests: { rmaNumber: string; status: string }[];
    workOrders: { workOrderNumber: string; title: string; status: string }[];
  };
};

export default function AssetsPage() {
  const { data, loading, error, reload } = useFetch<Asset[]>('/assets');
  const expiring = useFetch<Asset[]>('/assets/expiring-warranties?days=90');
  const [traceSerial, setTraceSerial] = useState('');
  const [trace, setTrace] = useState<TraceResult | null>(null);
  const [traceError, setTraceError] = useState<string | null>(null);
  const [tracing, setTracing] = useState(false);

  async function runTrace() {
    if (!traceSerial.trim()) return;
    setTracing(true);
    setTraceError(null);
    try {
      const result = await apiFetch<TraceResult>(`/assets/trace/${encodeURIComponent(traceSerial.trim())}`);
      setTrace(result);
    } catch (e) {
      setTrace(null);
      setTraceError(e instanceof Error ? e.message : 'Trace failed');
    } finally {
      setTracing(false);
    }
  }

  return (
    <div className="p-8">
      <PageHeader title="Installed Base" description="Customer-owned assets, serial/IMEI/MAC traceability, and warranty tracking" />

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="mb-3 font-medium text-slate-800">Serial / IMEI / MAC Trace</p>
        <div className="flex gap-3">
          <div className="flex-1">
            <FormField label="Lookup">
              <input
                className={inputClass}
                value={traceSerial}
                onChange={(e) => setTraceSerial(e.target.value)}
                placeholder="CAT48P-2024-00142 or IMEI/MAC"
                onKeyDown={(e) => e.key === 'Enter' && runTrace()}
              />
            </FormField>
          </div>
          <div className="flex items-end">
            <button type="button" className={btnPrimary} onClick={runTrace} disabled={tracing || !traceSerial}>
              {tracing ? 'Tracing...' : 'Trace'}
            </button>
          </div>
        </div>
        {traceError ? <p className="mt-2 text-sm text-red-600">{traceError}</p> : null}
        {trace ? (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-2">
              <p className="font-medium text-blue-900">{trace.asset.serialNumber}</p>
              <Badge>{trace.asset.status}</Badge>
              {trace.product.isEol ? <Badge variant="red">EOL Product</Badge> : null}
            </div>
            <p className="text-sm text-blue-700">{trace.product.sku} — {trace.product.name} · {trace.account.name}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-blue-600">
              {trace.asset.lotNumber ? <span>Lot: {trace.asset.lotNumber}</span> : null}
              {trace.asset.imei ? <span>IMEI: {trace.asset.imei}</span> : null}
              {trace.asset.macAddress ? <span>MAC: {trace.asset.macAddress}</span> : null}
            </div>
            {trace.order ? <p className="mt-1 text-xs text-blue-600">Order: {trace.order.orderNumber} ({trace.order.status})</p> : null}
            {trace.traceChain.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {trace.traceChain.map((step) => (
                  <span key={step.step} className="rounded bg-white/80 px-2 py-1 text-xs text-blue-800">
                    {step.step}{step.date ? ` · ${formatDate(step.date)}` : ''}{step.ref ? ` · ${step.ref}` : ''}
                  </span>
                ))}
              </div>
            ) : null}
            {(trace.serviceHistory.cases.length > 0 || trace.serviceHistory.workOrders.length > 0) ? (
              <p className="mt-2 text-xs text-blue-600">
                Service: {trace.serviceHistory.cases.length} cases, {trace.serviceHistory.workOrders.length} work orders
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {expiring.data && expiring.data.length > 0 ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-medium text-amber-900">{expiring.data.length} warranties expiring within 90 days</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {expiring.data.map((a) => (
              <span key={a.id} className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-800">
                {a.serialNumber} · {a.account.name} · expires {formatDate(a.warrantyEndDate)}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} onRetry={reload} /> : null}
        {!loading && !error && data && data.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3">Serial #</th>
                <th className="px-6 py-3">IMEI / MAC</th>
                <th className="px-6 py-3">Product</th>
                <th className="px-6 py-3">Account</th>
                <th className="px-6 py-3">Order</th>
                <th className="px-6 py-3">Installed</th>
                <th className="px-6 py-3">Warranty End</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono text-xs">
                    <button type="button" className="text-blue-600 hover:underline" onClick={() => { setTraceSerial(a.serialNumber); }}>
                      {a.serialNumber}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {a.imei ?? '—'}{a.macAddress ? <><br />{a.macAddress}</> : null}
                  </td>
                  <td className="px-6 py-4">{a.product.sku}<br /><span className="text-xs text-slate-500">{a.product.name}</span></td>
                  <td className="px-6 py-4">{a.account.name}</td>
                  <td className="px-6 py-4">{a.order?.orderNumber ?? '—'}</td>
                  <td className="px-6 py-4">{formatDate(a.installDate)}</td>
                  <td className="px-6 py-4">{formatDate(a.warrantyEndDate)}</td>
                  <td className="px-6 py-4"><Badge variant={a.status === 'active' ? 'green' : 'default'}>{a.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </div>
  );
}