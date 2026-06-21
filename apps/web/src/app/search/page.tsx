'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { inputClass } from '@/components/ui/FormField';

type SearchResults = {
  source?: string;
  accounts: { id: string; name: string; accountType: string }[];
  contacts: {
    id: string;
    firstName: string;
    lastName: string;
    account: { name: string };
  }[];
  products: { id: string; name: string; sku: string; listPrice: string | null }[];
  deals: {
    id: string;
    name: string;
    amount: string | null;
    account: { name: string };
  }[];
};

function SearchContent() {
  const searchParams = useSearchParams();
  const initial = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(initial);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await apiFetch<SearchResults>(
          `/search?q=${encodeURIComponent(query.trim())}`,
        );
        setResults(data);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const total =
    (results?.accounts.length ?? 0) +
    (results?.contacts.length ?? 0) +
    (results?.products.length ?? 0) +
    (results?.deals.length ?? 0);

  return (
    <div className="p-8">
      <PageHeader
        title="Global Search"
        description="Search across accounts, contacts, products, and deals"
      />

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Type to search..."
        className={`${inputClass} mb-6 max-w-xl`}
        autoFocus
      />

      {loading ? <LoadingState /> : null}

      {!loading && query && results ? (
        <div className="space-y-6">
          <p className="text-sm text-slate-500">
            {total} results for &quot;{query}&quot;
            {results.source ? ` · via ${results.source}` : ''}
          </p>

          {results.accounts.length > 0 ? (
            <ResultSection title="Accounts" href="/accounts">
              {results.accounts.map((a) => (
                <li key={a.id} className="text-sm">
                  <span className="font-medium text-slate-900">{a.name}</span>
                  <span className="ml-2 text-slate-500">{a.accountType}</span>
                </li>
              ))}
            </ResultSection>
          ) : null}

          {results.contacts.length > 0 ? (
            <ResultSection title="Contacts" href="/contacts">
              {results.contacts.map((c) => (
                <li key={c.id} className="text-sm">
                  <span className="font-medium text-slate-900">{c.firstName} {c.lastName}</span>
                  <span className="ml-2 text-slate-500">{c.account.name}</span>
                </li>
              ))}
            </ResultSection>
          ) : null}

          {results.products.length > 0 ? (
            <ResultSection title="Products" href="/products">
              {results.products.map((p) => (
                <li key={p.id} className="text-sm">
                  <span className="font-medium text-slate-900">{p.name}</span>
                  <span className="ml-2 text-slate-500">{p.sku} · {formatCurrency(p.listPrice)}</span>
                </li>
              ))}
            </ResultSection>
          ) : null}

          {results.deals.length > 0 ? (
            <ResultSection title="Deals" href="/deals">
              {results.deals.map((d) => (
                <li key={d.id} className="text-sm">
                  <span className="font-medium text-slate-900">{d.name}</span>
                  <span className="ml-2 text-slate-500">{d.account.name} · {formatCurrency(d.amount)}</span>
                </li>
              ))}
            </ResultSection>
          ) : null}

          {total === 0 ? (
            <p className="text-sm text-slate-400">No results found.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ResultSection({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        <Link href={href} className="text-sm text-blue-600 hover:text-blue-700">View all →</Link>
      </div>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8"><LoadingState /></div>}>
      <SearchContent />
    </Suspense>
  );
}