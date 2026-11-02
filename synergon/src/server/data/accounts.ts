import 'server-only';
import { db } from '../db';
import { assertBusiness, type Viewer } from '../session';
import { ForbiddenError } from '../errors';
import type { AccountOpp } from '@/lib/demo/types';

/** CRM sharing rule: an account is readable when the viewer's role is in ownerRoles. */
export const canReadAccount = (v: Viewer, a: { ownerRoles: string[] }) => a.ownerRoles.includes(v.role);

/** Account list: restricted accounts only expose name, industry, geography, tier and owner. */
export async function listAccounts(v: Viewer) {
  assertBusiness(v);
  const all = await db.account.findMany({ orderBy: { id: 'asc' } });
  const order = ['meridian', 'horizon', 'crescent', 'northstar', 'atlas'];
  all.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  return all.map(a => canReadAccount(v, a)
    ? { id: a.id, name: a.name, industry: a.industry, geo: a.geo, tier: a.tier, owner: a.ownerName, restricted: false as const, value: a.value, rel: a.rel, last: a.last, obs: a.obs }
    : { id: a.id, name: a.name, industry: a.industry, geo: a.geo, tier: a.tier, owner: a.ownerName, restricted: true as const });
}
export type AccountListItem = Awaited<ReturnType<typeof listAccounts>>[number];

/** Full account intelligence — throws Forbidden for accounts outside the viewer's scope. */
export async function getAccount(v: Viewer, id: string) {
  assertBusiness(v);
  const a = await db.account.findUnique({
    where: { id },
    include: { contacts: { orderBy: { order: 'asc' } }, interactions: { orderBy: { order: 'asc' } }, signalLinks: { include: { signal: true } } },
  });
  if (!a) throw new Error('not_found');
  if (!canReadAccount(v, a)) throw new ForbiddenError('Restricted — ' + a.name + ' is outside your authorised scope (owned by ' + a.ownerName + ')');
  return {
    id: a.id, name: a.name, industry: a.industry, geo: a.geo, hq: a.hq, size: a.size, rel: a.rel, value: a.value, last: a.last, tier: a.tier, owner: a.ownerName,
    obs: a.obs, costBase: a.costBase, insights: a.insights, actions: a.actions, hyp: a.hyp, challenge: a.challenge, hypotheses: a.hypotheses,
    opps: a.crmOpps as unknown as AccountOpp[],
    people: a.contacts.map(c => ({ name: c.name, title: c.title, stance: c.stance, strength: c.strength, lvl: c.lvl })),
    touches: a.interactions.map(x => ({ date: x.date, type: x.type, text: x.text })),
    signals: a.signalLinks.map(l => ({ id: l.signal.id, title: l.signal.title })),
  };
}
export type AccountDetail = Awaited<ReturnType<typeof getAccount>>;

/** First account the viewer may read (fallback when the requested one is restricted). */
export async function defaultAccountId(v: Viewer, wanted?: string | null) {
  const list = await listAccounts(v);
  const w = list.find(a => a.id === wanted && !a.restricted);
  return (w || list.find(a => !a.restricted))?.id ?? null;
}

export function accountBrief(a: AccountDetail, now: string) {
  return {
    title: a.name + ' — meeting briefing',
    sub: 'Sources: Salesforce CRM (synced 08:12), Microsoft 365 calendar, Radar360. Generated ' + now + '.',
    sections: [
      { h: 'Objective', items: [a.actions[0]] },
      { h: 'Context', items: [a.size + ' · ' + a.rel, a.obs, a.touches[0].date + ' — ' + a.touches[0].text] },
      { h: 'Stakeholders', items: a.people.map(p => p.name + ', ' + p.title + ' — ' + p.stance + ' (' + p.strength + ')') },
      { h: 'Talking points', items: a.insights },
      { h: 'Suggested asks', items: ['What would a 12-week proof of value need to demonstrate?', 'Who else must be involved before a proposal?'] },
    ],
  };
}
export type Brief = ReturnType<typeof accountBrief>;
