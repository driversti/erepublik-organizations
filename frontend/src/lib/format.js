export function formatCurrency(value) {
  if (value === null || value === undefined) return '—';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `${(value / 1_000).toFixed(0)}K`;
  return value.toFixed(2);
}

export function formatGold(value) {
  if (value === null || value === undefined) return '—';
  return value.toFixed(2);
}
