import { handle } from '@/server/api';
import { requireViewer } from '@/server/session';
import { listSolutions } from '@/server/data/solutions';
export const GET = () => handle(async () => ({ solutions: (await listSolutions(await requireViewer('studio'))).map(s => ({ id: s.id, title: s.title, account: s.account.name, stage: s.stage, ownerId: s.ownerId, businessCase: s.businessCase })) }));
