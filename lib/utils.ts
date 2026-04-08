export function formatCurrency(amount: number): string {
  if (amount === 0) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function generateUniqueSlug(name: string, existing: string[]): string {
  const base = slugify(name);
  if (!existing.includes(base)) return base;
  let i = 2;
  while (existing.includes(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

export function formatScore(scoreDisplay: string): string {
  if (!scoreDisplay || scoreDisplay === 'E') return 'E';
  const num = parseFloat(scoreDisplay);
  if (isNaN(num)) return scoreDisplay;
  return num > 0 ? `+${num}` : `${num}`;
}
