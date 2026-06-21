'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { formatCurrency } from '@/lib/format';

type SearchResults = {
  accounts: { id: string; name: string; accountType: string }[];
  contacts: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    account: { id: string; name: string };
  }[];
  products: {
    id: string;
    name: string;
    sku: string;
    listPrice: string | null;
  }[];
  deals: {
    id: string;
    name: string;
    amount: string | null;
    account: { id: string; name: string };
  }[];
};

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
        setOpen(true);
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const hasResults =
    results &&
    (results.accounts.length > 0 ||
      results.contacts.length > 0 ||
      results.products.length > 0 ||
      results.deals.length > 0);

  return (
    <div ref={ref} className="relative w-full max-w-xl">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && query.trim()) {
            router.push(`/search?q=${encodeURIComponent(query.trim())}`);
            setOpen(false);
          }
        }}
        placeholder="Search accounts, contacts, products, deals..."
        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />

      {open && query.trim() ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {loading ? (
            <p className="px-4 py-3 text-sm text-slate-400">Searching...</p>
          ) : hasResults ? (
            <div className="divide-y divide-slate-100 p-2">
              {results!.accounts.length > 0 ? (
                <Section title="Accounts">
                  {results!.accounts.map((a) => (
                    <ResultLink
                      key={a.id}
                      href={`/accounts`}
                      label={a.name}
                      sub={a.accountType}
                      onClick={() => setOpen(false)}
                    />
                  ))}
                </Section>
              ) : null}
              {results!.contacts.length > 0 ? (
                <Section title="Contacts">
                  {results!.contacts.map((c) => (
                    <ResultLink
                      key={c.id}
                      href={`/contacts`}
                      label={`${c.firstName} ${c.lastName}`}
                      sub={c.account.name}
                      onClick={() => setOpen(false)}
                    />
                  ))}
                </Section>
              ) : null}
              {results!.products.length > 0 ? (
                <Section title="Products">
                  {results!.products.map((p) => (
                    <ResultLink
                      key={p.id}
                      href={`/products`}
                      label={p.name}
                      sub={`${p.sku} · ${formatCurrency(p.listPrice)}`}
                      onClick={() => setOpen(false)}
                    />
                  ))}
                </Section>
              ) : null}
              {results!.deals.length > 0 ? (
                <Section title="Deals">
                  {results!.deals.map((d) => (
                    <ResultLink
                      key={d.id}
                      href={`/deals`}
                      label={d.name}
                      sub={`${d.account.name} · ${formatCurrency(d.amount)}`}
                      onClick={() => setOpen(false)}
                    />
                  ))}
                </Section>
              ) : null}
            </div>
          ) : (
            <p className="px-4 py-3 text-sm text-slate-400">No results found</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-2">
      <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </p>
      {children}
    </div>
  );
}

function ResultLink({
  href,
  label,
  sub,
  onClick,
}: {
  href: string;
  label: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block rounded-lg px-2 py-2 hover:bg-slate-50"
    >
      <p className="text-sm font-medium text-slate-900">{label}</p>
      <p className="text-xs text-slate-500">{sub}</p>
    </Link>
  );
}