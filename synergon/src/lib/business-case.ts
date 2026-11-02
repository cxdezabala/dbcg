// Port of the prototype business-case model (Component.bc).
import { PACKS } from './demo';
import type { Workstream } from './demo/types';

export type Scenario = 'conservative' | 'base' | 'ambitious';
export interface SolutionLike { pack: string; ws: Record<string, boolean>; costBase: number; scenario: string; expert: Record<string, string> }
export interface BusinessCaseResult { ws: Workstream[]; base: number; invest: number; pct: number; benefit: number; roi: number; pay: number | null; step: number }

export const SCEN_MULT: Record<Scenario, number> = { conservative: 0.7, base: 1, ambitious: 1.25 };

export function businessCase(sol: SolutionLike, scen?: Scenario): BusinessCaseResult {
  const P = PACKS[sol.pack];
  const sofia = sol.expert && sol.expert.sofia === 'contributed';
  const ws = P.ws.filter(w => sol.ws[w.id]).map(w => ({ ...w, save: w.id === 'w2' && sofia ? 7 : w.save }));
  const base = ws.reduce((t, w) => t + w.cost, 0);
  const invest = base * 1.15;
  const mult = SCEN_MULT[(scen || sol.scenario) as Scenario] ?? 1;
  const pct = ws.reduce((t, w) => t + w.save, 0) * mult;
  const benefit = sol.costBase * 1000 * pct / 100;
  const roi = invest ? ((2.2 * benefit - invest) / invest) * 100 : 0;
  let cum = 0, pay: number | null = null;
  for (let m = 1; m <= 36; m++) { cum += benefit * (m <= 12 ? 0.4 : m <= 24 ? 0.8 : 1) / 12; if (cum >= invest && !pay) pay = m; }
  return { ws, base, invest, pct, benefit, roi, pay, step: sol.costBase * 10 * mult };
}
export const payLabel = (p: number | null) => (p ? p + ' months' : '> 36 months');
