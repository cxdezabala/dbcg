'use client';
import { useT } from '@/i18n/client';
import { Tag } from './controls';

export type Prov = 'REPORTED' | 'ESTIMATED' | 'AI_HYPOTHESIS';
const LABEL: Record<Prov, string> = { REPORTED: 'Reported', ESTIMATED: 'Estimated ±20%', AI_HYPOTHESIS: 'AI hypothesis' };

/** Every Radar360 data point carries one of these labels. */
export function ProvTag({ p, title }: { p: Prov; title?: string }) {
  const t = useT();
  return <Tag kind={p === 'REPORTED' ? 'neutral' : p === 'ESTIMATED' ? 'outline' : 'accent'} className="prov"><span title={title} data-provenance={p}>{t(LABEL[p])}</span></Tag>;
}
