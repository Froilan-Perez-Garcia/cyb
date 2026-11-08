export function rateTone(rate: number) {
  if (rate >= 3) return { bar: 'bg-expense', soft: 'bg-expense/10 text-expense' }
  if (rate >= 1.5) return { bar: 'bg-warn', soft: 'bg-warn/10 text-warn' }
  if (rate > 0) return { bar: 'bg-accent', soft: 'bg-accent/10 text-accent' }
  return { bar: 'bg-muted/40', soft: 'bg-raised text-muted' }
}
