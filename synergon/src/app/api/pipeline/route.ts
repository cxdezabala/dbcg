import { handle } from '@/server/api';
import { requireViewer } from '@/server/session';
import { getPipelineScope } from '@/server/data/pipeline';
import { ciPipe } from '@/server/vm/ci-pipe';
export const GET = (req: Request) => handle(async () => {
  const v = await requireViewer('ci'); const sp = new URL(req.url).searchParams;
  const s = await getPipelineScope(v);
  return { scope: ciPipe(s, { team: sp.get('team') || undefined, stage: sp.get('stage') ? Number(sp.get('stage')) : null }), executives: s.teams.flatMap(t => t.execs.map(e => e.name)).concat(s.self && !s.teams.length ? [s.self.name] : []) };
});
