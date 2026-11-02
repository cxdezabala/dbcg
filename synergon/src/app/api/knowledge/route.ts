import { handle } from '@/server/api';
import { requireViewer } from '@/server/session';
import { collabVM } from '@/server/vm/collab';
export const GET = () => handle(async () => { const c = await collabVM(await requireViewer('collab'), {}); return { knowledge: c.knowledge, requests: c.requests }; });
