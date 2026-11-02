'use server';
import { revalidatePath } from 'next/cache';
import { db } from '../db';
import { requireViewer, updateUserState } from '../session';
import { audit, notify } from '../audit';
import { ForbiddenError } from '../errors';
import { LEADER_RECS } from '@/lib/demo';

async function leader() { const v = await requireViewer('command'); if (v.role !== 'lead' && v.role !== 'director') throw new ForbiddenError(); return v; }
async function director() { const v = await leader(); if (v.role !== 'director') throw new ForbiddenError('Organisation-level actions are reserved to the Commercial Director'); return v; }

export async function requestAnalysis(key: string, label: string) {
  const v = await leader();
  if (/^(t\d|o\d)$/.test(key) && v.role !== 'director') throw new ForbiddenError();
  if ((v.state.analysis || {})[key]) return { msg: '' };
  await updateUserState(v.id, s => ({ analysis: { ...(s.analysis || {}), [key]: true } }));
  if (key === 't1') await audit(v.name, 'Further analysis requested', 'Theme T1', 'Command');
  revalidatePath('/command');
  return { msg: key.startsWith('o') ? 'Validation request sent to related account teams' : key === 't1' ? 'Analysis requested from Commercial Strategy — due in 3 days' : label || 'Further analysis requested' };
}

/** Recommendation actions (assign capability initiative / request expert collaboration). */
export async function actOnRecommendation(i: number) {
  const v = await leader();
  if (v.role === 'lead' && i !== 1) throw new ForbiddenError();
  const r = LEADER_RECS[i]; if (!r || r.theme === 't1') return { msg: '' };
  const key = 'r' + i;
  if ((v.state.analysis || {})[key]) return { msg: '' };
  await updateUserState(v.id, s => ({ analysis: { ...(s.analysis || {}), [key]: true } }));
  await audit(v.name, i === 1 ? 'Capability initiative assigned' : 'Expert collaboration requested', r.obs.slice(0, 48) + '…', 'Command');
  await notify(i === 1 ? 'New development initiative: AI fluency path assigned to your team' : 'Leadership requested expert support in value modelling', ['lead'], i === 1 ? 'growth' : 'collab');
  revalidatePath('/', 'layout');
  return { msg: i === 1 ? 'AI fluency initiative assigned to team leaders' : 'Expert collaboration requested' };
}

/** Launches a strategic initiative: visible on the Home of executives in the selected teams. */
export async function launchInitiative(input: { name: string; teams: string[]; acts: { cap: boolean; exp: boolean; share: boolean } }) {
  const v = await director();
  const teams = (await db.team.findMany()).map(t => t.name).filter(n => input.teams.includes(n));
  if (!teams.length) return { ok: false, msg: 'Select at least one team' };
  const name = input.name.trim().slice(0, 160) || 'New strategic priority';
  const ini = await db.initiative.create({ data: { name, teams, acts: input.acts, progress: 5, ownerName: v.name, themeId: 't1' } });
  await updateUserState(v.id, { themeViewed: true });
  const teamIds = (await db.team.findMany({ where: { name: { in: teams } } })).map(t => t.id);
  const story = await db.solution.findFirst({ where: { story: true } });
  if (story && teamIds.includes('eiu')) await db.solution.update({ where: { id: story.id }, data: { initiativeId: ini.id } });
  await notify('New strategic initiative from ' + v.name + ': “' + name + '”' + (teams.includes('Enterprise · Iberia & UK') ? ' — your Meridian solution is linked' : ''), ['exec', 'lead'], 'home');
  if (input.acts.cap) {
    const execs = await db.user.findMany({ where: { teamId: { in: teamIds }, canLogin: true } });
    for (const e of execs) await db.learningAssignment.create({ data: { userId: e.id, title: 'AI Customer Operations Proposition — readiness path', kind: 'path', source: 'initiative', minutes: 20, initiativeId: ini.id } });
    await notify('Learning assigned: AI Customer Operations readiness path', ['exec'], 'growth');
  }
  if (input.acts.exp) await db.expertRequest.create({ data: { label: name + ' — proposition team', assignee: 'AI Service Transformation community', requesterId: v.id, status: 'answered' } });
  await audit(v.name, 'Strategic initiative created', name + ' · ' + teams.length + ' teams', 'Command');
  if (input.acts.share) await audit(v.name, 'Organisational insight shared (leadership-approved)', 'Theme T1', 'Governance');
  revalidatePath('/', 'layout');
  return { ok: true, msg: 'Initiative launched — now visible to ' + teams.length + ' teams. Switch to Executive to see the impact.' };
}
