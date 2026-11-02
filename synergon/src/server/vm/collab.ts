// Port of Component.collabVals().
import 'server-only';
import { db } from '../db';
import { assertBusiness, type Viewer } from '../session';
import { solutionWhere } from '../data/solutions';
import { EXPERTS, COMMUNITIES } from '@/lib/demo';
import { initials } from '@/lib/format';

const STATE: Record<string, string> = { validated: 'Validated', in_review: 'In review', needs_evidence: 'Needs evidence', draft: 'Draft' };

export async function collabVM(v: Viewer, sp: { expert?: string }) {
  assertBusiness(v);
  const where = await solutionWhere(v);
  const [items, sols, loose, ini] = await Promise.all([
    db.knowledgeItem.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] }),
    db.solution.findMany({ where: { AND: [where, { completed: false }] }, include: { requests: { include: { expert: true } }, account: true }, orderBy: { createdAt: 'desc' } }),
    db.expertRequest.findMany({ where: { solutionId: null } }),
    db.initiative.count(),
  ]);
  const e = EXPERTS.find(x => x.id === sp.expert) || EXPERTS[0];
  const story = sols.find(s => s.story);
  const canVal = v.role === 'lead' || v.role === 'director';
  const all = items.map(k => ({ id: k.id, title: k.title, author: k.authorName, domain: k.domain, state: STATE[k.status], date: k.date, saves: k.saves + k.savedBy.length, saved: k.savedBy.includes(v.id), body: k.body, comments: (k.comments as { text: string }[]).map(c => c.text), canValidate: canVal && k.status === 'in_review' }));
  // Request status only — private 1:1 messages are never included here.
  const reqs = sols.flatMap(s => s.requests.filter(r => r.expert).map(r => ({ what: s.title, who: r.expert!.name, status: r.status === 'contributed' ? 'Contributed' : r.status === 'connected' ? 'Connected' : 'Awaiting response', accent: r.status === 'contributed' })))
    .concat(loose.map(r => ({ what: r.label || '', who: r.assignee || 'Unassigned', status: r.status === 'unmet' ? 'Unmet demand' : 'Answered', accent: false })));
  return {
    experts: EXPERTS.map(x => ({ id: x.id, name: x.name, title: x.title, loc: x.loc, delivered: x.delivered, domain: x.domain, domains: x.domains, industries: x.industries, ini: initials(x.name) })),
    ex: { ...e, ini: initials(e.name), prev: all.filter(k => k.author === e.name).map(k => k.title + ' — ' + k.state).concat(['Contributed to ' + e.delivered + ' solution designs']) },
    knowledge: all, requests: reqs,
    sols: sols.map(s => ({ id: s.id, label: s.title + ' · ' + s.account.name })), target: (story || sols[0])?.id ?? null,
    communities: COMMUNITIES.map(([name, members, note], i) => ({ name, members, note, badge: i === 0 && ini > 0 })),
  };
}
export type CollabVM = Awaited<ReturnType<typeof collabVM>>;
