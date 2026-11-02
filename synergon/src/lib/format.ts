/** €k → "€1.23M" / "€650k" (prototype fmt). */
export const fmtK = (k: number) => (k >= 1000 ? '€' + (k / 1000).toFixed(2) + 'M' : '€' + Math.round(k) + 'k');
/** €M → "€1.6M" (pipeline). */
export const fmtM = (v: number) => '€' + v.toFixed(1) + 'M';
export const pc = (v: number) => Math.round(v * 100) + '%';
/** Radar: €M → "€9.6B" / "€640M". */
export const fmtMB = (v: number) => (v >= 1000 ? '€' + (v / 1000).toFixed(1) + 'B' : '€' + Math.round(v) + 'M');
/** Radar: € → "€18.2M" / "€640k". */
export const fmtE = (v: number) => (v >= 1e6 ? '€' + (v / 1e6).toFixed(1) + 'M' : '€' + Math.round(v / 1000) + 'k');
export const fmtN = (v: number) => Math.round(v).toLocaleString('en-GB');
export const initials = (n: string) => n.split(' ').map(w => w[0]).join('').slice(0, 2);
export function nowLabel(d = new Date()) {
  return 'Today ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
export function relTime(d: Date, now = new Date()) {
  const s = (now.getTime() - d.getTime()) / 1000;
  if (s < 90) return 'Just now';
  if (s < 3600) return Math.round(s / 60) + ' min ago';
  if (s < 86400) return Math.round(s / 3600) + ' h ago';
  const days = Math.round(s / 86400);
  return days === 1 ? '1 d ago' : days + ' d ago';
}
