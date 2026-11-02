import 'server-only';
import { db } from './db';
import { DEMO_USERS } from './seed';
import type { Role } from '@/lib/demo/types';
import type { UserState } from './session';

export interface ScenarioStep { n: number; title: string; module: string; who: string; role: Role; done: boolean }

/** Progress of the guided demo "Emerging AI Transformation Opportunity" — derived from persisted data. */
export async function getScenario(): Promise<{ steps: ScenarioStep[]; doneCount: number; current: number }> {
  const [jav, dan, link, story, lesson, ini] = await Promise.all([
    db.user.findUnique({ where: { id: DEMO_USERS.exec.id }, select: { state: true } }),
    db.user.findUnique({ where: { id: DEMO_USERS.director.id }, select: { state: true } }),
    db.signalLink.findUnique({ where: { signalId_accountId: { signalId: 's1', accountId: 'meridian' } } }),
    db.solution.findFirst({ where: { story: true }, include: { requests: true } }),
    db.learningAssignment.findFirst({ where: { userId: DEMO_USERS.exec.id, title: 'Value-based selling for AI transformation', status: 'completed' } }),
    db.initiative.count(),
  ]);
  const js = (jav?.state || {}) as UserState, ds = (dan?.state || {}) as UserState;
  const sofia = !!story?.requests.find(r => r.expertId === 'sofia' && r.status === 'contributed');
  const raw: [string, string, string, Role, boolean][] = [
    ['Account intelligence', 'Commercial Intelligence', 'Javier', 'exec', !!js.ciViewed],
    ['Connect market signal', 'Radar360', 'Javier', 'exec', !!link],
    ['Frame the solution', 'Solution Design Studio', 'Javier', 'exec', !!story?.framed],
    ['Mobilise expertise', 'Collaboration & Contribution', 'Javier', 'exec', sofia],
    ['Learn in the flow of work', 'Capabilities & Growth', 'Javier', 'exec', !!lesson],
    ['Detect the pattern', 'SYNERGON Command', 'Daniel', 'director', !!ds.themeViewed],
    ['Launch initiative', 'SYNERGON Command', 'Daniel', 'director', ini > 0],
    ['Organizational alignment', 'Home', 'Javier', 'exec', !!js.alignedSeen],
  ];
  const steps = raw.map(([title, module, who, role, done], i) => ({ n: i + 1, title, module, who, role, done }));
  return { steps, doneCount: steps.filter(s => s.done).length, current: steps.findIndex(s => !s.done) };
}

/** Where each step takes the user (and as which demo role). */
export async function scenarioTarget(n: number): Promise<{ role: Role; url: string }> {
  const story = await db.solution.findFirst({ where: { story: true } });
  switch (n) {
    case 1: return { role: 'exec', url: '/ci?acct=meridian' };
    case 2: return { role: 'exec', url: '/radar?tab=dossier&co=meridian&dtab=overview#d-signals' };
    case 3: return { role: 'exec', url: story ? '/studio?sol=' + story.id : '/ci?acct=meridian&hint=studio' };
    case 4:
      if (story) { await db.solution.update({ where: { id: story.id }, data: { stage: 5 } }); return { role: 'exec', url: '/studio?sol=' + story.id }; }
      return { role: 'exec', url: '/collab?expert=sofia' };
    case 5: return { role: 'exec', url: '/growth' };
    case 6: return { role: 'director', url: '/command?theme=t1' };
    case 7: return { role: 'director', url: '/command?theme=t1&initiative=new' };
    default: return { role: 'exec', url: '/home' };
  }
}
