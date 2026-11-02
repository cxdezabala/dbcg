import { describe, it, expect } from 'vitest';
import { loadReference } from './reference';
import { generatePipeline, STAGES } from '@/lib/demo/pipeline';
import { ACCOUNTS, SIGNALS, ROLE_INFO, ACCESS as DATA_ACCESS, COS, PACKS } from '@/lib/demo';
import { ACCESS } from '@/lib/rbac';
import { analyse, generic } from '@/lib/demo/radar';
import { businessCase } from '@/lib/business-case';

const ref = loadReference();

describe('ported demo data matches /reference', () => {
  it('pipeline generator reproduces every executive, opportunity and figure', () => {
    const ours = generatePipeline();
    expect(ours.length).toBe(ref.SYNP.TEAMS.length);
    ours.forEach((t, i) => {
      const r = ref.SYNP.TEAMS[i];
      expect(t.id).toBe(r.id);
      expect(t.execs.map(e => e.name)).toEqual(r.execs.map((e: any) => e.name));
      t.execs.forEach((e, j) => {
        const re = r.execs[j];
        expect({ pipe: e.pipe, won: e.won, lost: e.lost, wonN: e.wonN, lostN: e.lostN, quota: e.quota }).toEqual({ pipe: re.pipe, won: re.won, lost: re.lost, wonN: re.wonN, lostN: re.lostN, quota: re.quota });
        expect(e.stages).toEqual(re.stages); expect(e.months).toEqual(re.months);
        expect(e.opps).toEqual(JSON.parse(JSON.stringify(re.opps))); expect(e.closed).toEqual(JSON.parse(JSON.stringify(re.closed)));
      });
    });
    expect(STAGES.map(s => s.p)).toEqual(ref.SYNP.STAGES.map((s: any) => s.p));
  });
  it('accounts, signals and roles are identical', () => {
    expect(JSON.parse(JSON.stringify(ACCOUNTS))).toEqual(JSON.parse(JSON.stringify(ref.SYN.ACCOUNTS)));
    expect(SIGNALS.map(s => s.id)).toEqual(ref.SYN.SIGNALS.map((s: any) => s.id));
    expect(ROLE_INFO).toEqual(JSON.parse(JSON.stringify(ref.SYN.ROLE_INFO)));
    expect(ACCESS).toEqual(JSON.parse(JSON.stringify(ref.SYN.ACCESS)));
    expect(DATA_ACCESS).toEqual(ACCESS);
  });
  it('analyse() and generic() match the prototype', () => {
    for (const co of COS) for (const ov of [{}, { ld: 1500 }, { exec: 0.3 }]) {
      const a = analyse(co, ov), b = ref.SYNR.analyse(ref.SYNR.COS.find((c: any) => c.id === co.id), ov);
      expect(JSON.parse(JSON.stringify(a))).toEqual(JSON.parse(JSON.stringify(b)));
    }
    const g = generic('Lumen Logistics', 'Logistics', 2500, 'Spain', 'x');
    const rg = ref.SYNR.generic('Lumen Logistics', 'Logistics', 2500, 'Spain'); rg.id = 'x';
    expect(JSON.parse(JSON.stringify(g))).toEqual(JSON.parse(JSON.stringify(rg)));
  });
  it('solution packs keep framing text with the account name', () => {
    const r = ref.SYN.PACKS.aiops.framing('Meridian Financial Group');
    expect(PACKS.aiops.framing.map(([l, t]) => [l, t.replace('{account}', 'Meridian Financial Group')])).toEqual(r);
  });
});

describe('business case model', () => {
  const sol = { pack: 'aiops', ws: { w1: true, w2: true, w4: true, w5: true, w6: true }, costBase: 46, scenario: 'base', expert: {} as Record<string, string> };
  it('computes investment, benefit, ROI and payback like the prototype', () => {
    const b = businessCase(sol);
    expect(b.invest).toBeCloseTo((650 + 1400 + 380 + 520 + 210) * 1.15);
    expect(b.pct).toBe(13);
    expect(b.benefit).toBeCloseTo(46 * 1000 * 0.13);
    expect(b.pay).toBe(16); // 40% ramp in year 1, 80% in year 2
  });
  it('Sofia Chen’s contribution lifts the agent-assist savings rate 6% → 7%', () => {
    expect(businessCase({ ...sol, expert: { sofia: 'contributed' } }).pct).toBe(14);
  });
  it('scenarios apply 0.7 / 1 / 1.25 multipliers', () => {
    expect(businessCase(sol, 'conservative').pct).toBeCloseTo(9.1);
    expect(businessCase(sol, 'ambitious').pct).toBeCloseTo(16.25);
  });
});
