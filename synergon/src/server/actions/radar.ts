'use server';
import { revalidatePath } from 'next/cache';
import type { Prisma } from '@prisma/client';
import { db } from '../db';
import { requireViewer, assertBusiness, updateUserState, type Prep } from '../session';
import { getAccount } from '../data/accounts';
import { aiPicks, listCompanies } from '../data/radar';
import { audit } from '../audit';
import { generic, financialProvenance } from '@/lib/demo/radar';
import { BENCH } from '@/lib/demo';

const P_EMPTY: Prep = { stake: [], hooks: [], qs: [], bu: null, comp: false, type: 'first', date: '' };

async function radarViewer() { const v = await requireViewer('radar'); assertBusiness(v); return v; }
async function ensureCompany(v: Awaited<ReturnType<typeof radarViewer>>, coId: string) {
  if (!(await listCompanies(v)).some(c => c.id === coId)) throw new Error('not_found');
}

export async function setLens(lens: 'consulting' | 'execed') {
  const v = await radarViewer();
  await updateUserState(v.id, { lens: lens === 'execed' ? 'execed' : 'consulting' });
  revalidatePath('/radar');
}

export async function updatePrep(coId: string, op: { toggle?: { k: 'stake' | 'hooks' | 'qs'; val: string }; set?: Partial<Pick<Prep, 'bu' | 'comp' | 'type' | 'date'>> }) {
  const v = await radarViewer(); await ensureCompany(v, coId);
  await updateUserState(v.id, s => {
    const cur: Prep = { ...P_EMPTY, ...((s.prep || {})[coId] || {}) };
    if (op.toggle) { const arr = cur[op.toggle.k]; cur[op.toggle.k] = arr.includes(op.toggle.val) ? arr.filter(x => x !== op.toggle!.val) : [...arr, op.toggle.val]; }
    if (op.set) Object.assign(cur, op.set);
    return { prep: { ...(s.prep || {}), [coId]: cur } };
  });
  revalidatePath('/radar');
}

export async function applyAiPicks(coId: string) {
  const v = await radarViewer();
  const picks = await aiPicks(v, coId);
  await updateUserState(v.id, s => ({ prep: { ...(s.prep || {}), [coId]: picks } }));
  revalidatePath('/radar');
}

export async function setInvestmentOverride(coId: string, patch: { ld?: number; exec?: number } | null) {
  const v = await radarViewer(); await ensureCompany(v, coId);
  await updateUserState(v.id, s => {
    const o = { ...(s.ldOv || {}) };
    if (patch == null) delete o[coId];
    else o[coId] = { ...(o[coId] || {}), ...(patch.ld != null ? { ld: Math.max(200, Math.min(2000, patch.ld)) } : {}), ...(patch.exec != null ? { exec: Math.max(0.1, Math.min(0.45, patch.exec)) } : {}) };
    return { ldOv: o };
  });
  revalidatePath('/radar');
}

export async function linkSignal(signalId: string, acctId: string, on: boolean) {
  const v = await radarViewer();
  const a = await getAccount(v, acctId);
  if (on) {
    await db.signalLink.upsert({ where: { signalId_accountId: { signalId, accountId: acctId } }, create: { signalId, accountId: acctId, linkedBy: v.id }, update: {} });
    await audit(v.name, 'Signal connected to account', signalId.toUpperCase() + ' → ' + a.name, 'Radar360');
  } else await db.signalLink.deleteMany({ where: { signalId, accountId: acctId } });
  revalidatePath('/', 'layout');
  return { msg: on ? 'Signal connected to ' + a.name + ' — visible in Commercial Intelligence' : '' };
}

export async function toggleSavedSignal(signalId: string) {
  const v = await radarViewer();
  const saved = v.state.saved || [];
  const on = !saved.includes(signalId);
  await updateUserState(v.id, { saved: on ? [...saved, signalId] : saved.filter(x => x !== signalId) });
  revalidatePath('/radar');
  return { on };
}

/** "+ New company": builds a dossier from sector benchmarks — every figure is stored as ESTIMATED. */
export async function createCompany(input: { name: string; sector: string; emp: number; country: string }) {
  const v = await radarViewer();
  const name = input.name.trim().slice(0, 120); const emp = Math.round(Number(input.emp));
  if (!name || !(emp > 0)) return { ok: false, msg: 'Enter a company name and approximate headcount' };
  const sector = BENCH[input.sector] ? input.sector : 'Insurance';
  const c = generic(name, sector, emp, (input.country || '—').trim().slice(0, 80));
  await db.company.create({ data: { id: c.id, name: c.name, sector, custom: true, createdBy: v.id, dossier: c as unknown as Prisma.InputJsonValue, financials: financialProvenance(c) as unknown as Prisma.InputJsonValue } });
  await audit(v.name, 'Company snapshot generated (estimates)', name, 'Radar360');
  revalidatePath('/radar');
  return { ok: true, id: c.id, msg: 'Snapshot built from the sector model — every figure is labelled as estimated' };
}
