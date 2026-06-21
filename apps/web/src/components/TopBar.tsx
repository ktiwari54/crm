'use client';

import { GlobalSearch } from '@/components/GlobalSearch';

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white px-6 py-4">
      <GlobalSearch />
    </header>
  );
}