export function formatCurrency(
  value: string | number | null | undefined,
  currency = 'USD',
): string {
  const num = Number(value ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatNumber(value: string | number | null | undefined): string {
  const num = Number(value ?? 0);
  return new Intl.NumberFormat('en-US').format(num);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatPercent(value: string | number | null | undefined): string {
  if (value == null) return '—';
  return `${Number(value).toFixed(1)}%`;
}

export function fullName(
  first?: string | null,
  last?: string | null,
): string {
  return [first, last].filter(Boolean).join(' ') || '—';
}