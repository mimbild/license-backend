export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function isFuture(date?: Date | null) {
  return Boolean(date && date.getTime() > Date.now());
}

