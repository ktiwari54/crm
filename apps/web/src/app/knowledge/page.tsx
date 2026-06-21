'use client';

import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { apiFetch } from '@/lib/api';

type Article = {
  id: string;
  title: string;
  body: string;
  category: string | null;
  status: string;
  viewCount: number;
  product: { sku: string; name: string } | null;
};

export default function KnowledgePage() {
  const [q, setQ] = useState('');
  const { data, loading, error, reload } = useFetch<Article[]>(`/knowledge?status=published${q ? `&q=${encodeURIComponent(q)}` : ''}`);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function openArticle(id: string) {
    setExpanded(id);
    await apiFetch(`/knowledge/${id}/view`, { method: 'POST' });
    await reload();
  }

  return (
    <div className="p-8">
      <PageHeader title="Knowledge Base" description="Product FAQs, troubleshooting, and warranty policies" />
      <div className="mb-4">
        <input
          className="w-full max-w-md rounded-lg border border-slate-300 px-4 py-2 text-sm"
          placeholder="Search articles..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && reload()}
        />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} onRetry={reload} /> : null}
        {!loading && !error && data && data.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {data.map((a) => (
              <div key={a.id} className="px-6 py-4">
                <button type="button" className="w-full text-left" onClick={() => openArticle(a.id)}>
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-900">{a.title}</p>
                    <div className="flex gap-2">
                      {a.category ? <Badge>{a.category}</Badge> : null}
                      <span className="text-xs text-slate-400">{a.viewCount} views</span>
                    </div>
                  </div>
                  {a.product ? <p className="mt-1 text-xs text-slate-500">{a.product.sku} — {a.product.name}</p> : null}
                </button>
                {expanded === a.id ? (
                  <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{a.body}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}