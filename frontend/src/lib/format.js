export function formatCurrency(value) {
  if (value == null || !Number.isFinite(value)) return '—';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) {
    const k = Math.round(value / 1_000);
    if (k >= 1_000) return `${(value / 1_000_000).toFixed(1)}M`;
    return `${k}K`;
  }
  return value.toFixed(2);
}

export function formatGold(value) {
  if (value == null || !Number.isFinite(value)) return '—';
  return value.toFixed(2);
}
