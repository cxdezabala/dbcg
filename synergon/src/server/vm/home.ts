// Port of the HOME section of Component.renderVals().
import 'server-only';
import { db } from '../db';
import type { Viewer } from '../session';
import { getPipelineScope } from '../data/pipeline';
import { storySolution, t1count, pendingValidation, lessonDone, expertStatus } from '../data/solutions';
import { getAccount, accountBrief, canReadAccount } from '../data/accounts';
import { homeDash } from './home-dash';
import { nowLabel } from '@/lib/format';

export type Action = { href: string } | { modal: 'brief' | 'lesson' };
export interface Prio { num: string; title: string; meta: string; tag: string; tagCls: string; done?: boolean; first: boolean; go: Action }

export async function homeVM(v: Viewer, sp: { scope?: string; team?: string }) {
  const isExec = v.role === 'exec', isLead = v.role === 'lead', isDirector = v.role === 'director';
  const [scope, story, t1, pending, learned, ini] = await Promise.all([
    getPipelineScope(v), storySolution(v), t1count(), pendingValidation(), lessonDone(v.id), db.initiative.findFirst({ orderBy: { createdAt: 'desc' } }),
  ]);
  const hd = homeDash(scope, sp);
  const teamName = v.teamId ? (await db.team.findUnique({ where: { id: v.teamId } }))?.name ?? null : null;
  // Initiatives are assigned to teams and appear on the Home of executives and leaders in those teams.
  const iniVisible = !!ini && (isExec || isLead) && !!teamName && ini.teams.includes(teamName);
  const storyHref = story ? '/studio?sol=' + story.id : '/studio';
  const initiative = iniVisible ? { name: ini!.name, homeLine: (isExec ? 'Your Meridian solution is linked. ' : '') + 'Teams: ' + ini!.teams.join(', ') + '. Kick-off 14 Nov · shared proposition team with Sofia Chen.', solHref: storyHref } : null;

  let pr: Omit<Prio, 'num' | 'first'>[];
  if (isDirector) pr = [
    { title: 'Review emerging pattern: AI customer operations (' + t1 + ' executives, 3 BUs)', meta: 'SYNERGON Command · collective intelligence', tag: 'High confidence', tagCls: 'tag-accent', go: { href: '/command?theme=t1' } },
    { title: 'Q4 strategic alignment review — 2 priorities at risk', meta: 'Strategic alignment', tag: 'Due 8 Nov', tagCls: 'tag-neutral', go: { href: '/command' } },
    { title: 'Decide on AI fluency capability investment', meta: 'Capability intelligence · 5 of 6 teams below target', tag: 'Decision', tagCls: 'tag-neutral', go: { href: '/command' } },
    { title: 'Value-modelling expertise bottleneck', meta: 'Collaboration intelligence', tag: 'Medium', tagCls: 'tag-neutral', go: { href: '/collab?expert=hannah' } }];
  else if (isLead) pr = [
    { title: 'Validate ' + pending + ' knowledge contributions', meta: 'Collaboration & Contribution · human validation', tag: 'Action', tagCls: 'tag-accent', go: { href: '/collab' } },
    { title: 'Team capability focus: negotiation before Q4 procurement stages', meta: 'Team Intelligence · aggregated', tag: 'Team', tagCls: 'tag-neutral', go: { href: '/command' } },
    { title: 'Pair Meridian and Horizon solution designs — related AI service briefs', meta: 'Solution Design Studio', tag: 'Opportunity', tagCls: 'tag-neutral', go: { href: '/studio' } },
    { title: 'Coaching conversation: Meridian deal strategy with Javier', meta: 'Calendar · Thu 10:00', tag: 'Today', tagCls: 'tag-neutral', go: { href: '/ci?acct=meridian' } }];
  else pr = [
    { title: 'Prepare for Meridian COO meeting — 12 Nov', meta: 'Commercial Intelligence · CRM + calendar', tag: 'Meeting', tagCls: 'tag-neutral', go: { href: '/ci?acct=meridian' } },
    { title: story ? 'Advance Meridian solution — stage ' + story.stage + ' of 7' : 'Frame the Meridian customer-operations opportunity', meta: 'Solution Design Studio', tag: 'Opportunity', tagCls: 'tag-neutral', go: { href: story ? storyHref : '/ci?acct=meridian' } },
    { title: 'Respond to Horizon Telecom tender pre-announcement', meta: 'Radar360 · verified signal', tag: 'Signal', tagCls: 'tag-neutral', go: { href: '/radar?tab=signals&signal=s3' } },
    { title: '5-minute lesson before the procurement review', meta: 'Capabilities & Growth · contextual', tag: learned ? 'Completed' : '5 min', tagCls: 'tag-neutral', done: learned, go: { href: '/growth' } }];
  if (initiative) pr.unshift({ title: 'Align with initiative: ' + initiative.name, meta: 'Leadership priority · Daniel Foster', tag: 'Leadership', tagCls: 'tag-accent', go: { href: storyHref } });
  const priorities: Prio[] = pr.slice(0, 5).map((p, i) => ({ ...p, num: String(i + 1).padStart(2, '0'), first: i === 0 }));

  const iniCount = await db.initiative.count();
  const pulse = (isDirector
    ? [['Leadership reviews', '3', 'This week', 'command'], ['Emerging signals', '12', '3 high relevance', 'radar'], ['Open expert requests', '19', '7 value modelling', 'collab'], ['Initiatives in flight', String(iniCount + 5), 'Strategic', 'command']]
    : isLead ? [['Team client meetings', '27', '+5 vs average', 'ci'], ['Coaching sessions', '4', 'This week', 'home'], ['Signals for team', '9', '2 new', 'radar'], ['Contributions to validate', String(pending), 'Knowledge', 'collab']]
      : [['Client meetings', '4', 'Next: Meridian, 12 Nov', 'ci'], ['Relevant signals', '5', '2 new verified', 'radar'], ['Expert requests', '1', 'Sofia Chen', 'collab'], ['Learning this week', '5 min', 'Contextual lesson', 'growth']])
    .map(([label, value, note, view]) => ({ label, value, note, href: '/' + view }));

  const recs: { src: string; title: string; body: string; cta: string; go: Action }[] = isDirector
    ? [{ src: 'Collective intelligence', title: 'A pattern is emerging across three business units', body: 'Executives in three teams are designing similar AI customer-operations solutions.', cta: 'Review evidence', go: { href: '/command?theme=t1' } },
      { src: 'Capability intelligence', title: 'AI fluency gap in Gulf Energy', body: 'Lowest capability score in the organisation (2.3, n=9).', cta: 'Open heatmap', go: { href: '/command' } },
      { src: 'Collaboration intelligence', title: 'Value-modelling demand exceeds supply', body: '7 open requests for 2 qualified experts.', cta: 'View experts', go: { href: '/collab?expert=hannah' } }]
    : isLead ? [{ src: 'Studio · team activity', title: 'Two executives pursue related AI service briefs', body: 'Meridian and Horizon solutions share 4 of 6 workstreams.', cta: 'Compare solutions', go: { href: '/studio' } },
      { src: 'Team capability', title: 'Negotiation below target before 3 procurement stages', body: 'Assign the 6-minute procurement role-play to the team.', cta: 'Open Team Intelligence', go: { href: '/command' } },
      { src: 'Knowledge', title: 'Contributions awaiting your validation', body: 'Validated knowledge becomes reusable across the organisation.', cta: 'Review', go: { href: '/collab' } }]
      : [{ src: 'CRM · Calendar', title: 'Prepare a strategic briefing for your 12 Nov meeting', body: 'Elena Vidal (COO) has raised cost-to-serve pressure three times.', cta: 'Generate briefing', go: { modal: 'brief' } },
        { src: 'Radar360 · verified', title: 'An industry development may affect Meridian', body: 'AI-enabled customer operations investment is accelerating in European banking.', cta: 'Explore signal', go: { href: '/radar?tab=signals&signal=s1' } },
        { src: 'Collaboration · validated profile', title: 'An internal expert matches your opportunity', body: 'Sofia Chen has delivered 14 AI service transformations.', cta: 'View expert', go: { href: '/collab?expert=sofia' } }];

  const feed: { ini: string; who: string; text: string; tag: string; tagCls: string; time: string; href: string }[] = [];
  if (ini) feed.push({ ini: 'DF', who: 'Daniel Foster', text: 'launched the strategic initiative “' + ini.name + '”.', tag: 'Leadership-approved', tagCls: 'tag-accent', time: 'Just now', href: '/home' });
  if (story && expertStatus(story).sofia === 'contributed') feed.push({ ini: 'SC', who: 'Sofia Chen', text: 'contributed expertise to “' + story.title + '”: sequence agent-assist before automation.', tag: 'Expert contribution · in review', tagCls: 'tag-neutral', time: 'Today', href: storyHref });
  feed.push({ ini: 'HO', who: 'Hannah Ortiz', text: 'updated the validated cost-to-serve value-model template.', tag: 'Verified knowledge', tagCls: 'tag-neutral', time: 'Yesterday', href: '/collab' },
    { ini: 'OG', who: 'Oliver Grant', text: 'shared lessons from 3 telecom churn pilots.', tag: 'In review', tagCls: 'tag-neutral', time: '2 days ago', href: '/collab' },
    { ini: 'KA', who: 'Karim Al-Fayed', text: 'answered a request on Gulf utility digital twins.', tag: 'Collaboration', tagCls: 'tag-neutral', time: '3 days ago', href: '/collab?expert=karim' });

  // Executive recommendation "Generate briefing" — only built when the viewer may read Meridian.
  const mer = await db.account.findUnique({ where: { id: 'meridian' }, select: { ownerRoles: true } });
  const brief = isExec && mer && canReadAccount(v, mer) ? accountBrief(await getAccount(v, 'meridian'), nowLabel()) : null;

  return {
    hd, initiative, priorities, pulse, recs, feed: feed.slice(0, 4), brief, pending, learned,
    lessonKicker: learned ? 'Completed ✓' : 'Recommended microlearning',
    growthLine: (learned ? '4' : '3') + ' lessons completed this month · 1 capability evidence validated (business case, Oct) · completion ≠ demonstrated competence',
    markAligned: isExec && iniVisible && !v.state.alignedSeen,
  };
}
export type HomeVM = Awaited<ReturnType<typeof homeVM>>;
