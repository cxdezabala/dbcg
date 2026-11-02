import type { Role, View } from './demo/types';
import { VIEW_META, ROLE_INFO } from './demo';

/** Kicker / title / subtitle of each view, per role (ported verbatim from the prototype). */
export function viewHeader(view: View, role: Role, first: string, now = new Date()) {
  const isLead = role === 'lead', isDirector = role === 'director', isAdmin = role === 'admin';
  const M = VIEW_META[view];
  const kicker = (M[0] === '—' ? '' : M[0] + ' — ') + (view === 'command' && isLead ? 'Team Intelligence' : M[1]) + ' · ' + ROLE_INFO[role].title;
  const h = now.getHours();
  const titles: Record<View, string> = {
    home: (h < 12 ? 'Good morning, ' : h < 18 ? 'Good afternoon, ' : 'Good evening, ') + first + '.',
    ci: 'Account Intelligence Workspace', radar: 'Client & Market Intelligence', studio: 'Solution Design Studio', growth: 'Growth Workspace',
    collab: 'Collaboration & Expertise', command: isLead ? 'Team Intelligence' : 'Leadership Intelligence', settings: isAdmin ? 'Settings, Integrations & Governance' : 'Settings & Integrations',
  };
  const subs: Record<View, string> = {
    home: isDirector ? 'Here is what matters for your commercial organisation today.' : isLead ? 'Here is what matters for your team’s commercial success today.' : 'Here is what matters for your commercial success today.',
    ci: 'Interprets CRM-connected data — it does not replace your CRM. Salesforce is connected as an external, read-only system.',
    radar: 'Prepare any client meeting in minutes: economic snapshot, business units, investment capacity, competitors, stakeholders and where we can help. Reported facts, estimates and AI hypotheses are always labelled.',
    studio: 'AI-powered business solution architecture and co-creation — from business challenge to executive proposal.',
    growth: 'Learning in the flow of work. Course completion is tracked separately from demonstrated capability.',
    collab: 'Discover expertise, collaborate in context and contribute validated knowledge.',
    command: isLead ? 'Team-scoped intelligence for Enterprise Accounts · Iberia & UK. Derived from authorised, aggregated data.' : 'Organisational intelligence derived from authorised, aggregated activity across all five components. Updated today 08:30.',
    settings: isAdmin ? 'Users, roles, integrations, data-access policies, AI governance and audit. Administrators configure — they cannot read confidential business content.' : 'Integration status and personal preferences. Governance settings are managed by your administrator.',
  };
  return { kicker, title: titles[view], sub: subs[view] };
}
