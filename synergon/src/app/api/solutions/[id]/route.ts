import { handle } from '@/server/api';
import { requireViewer } from '@/server/session';
import { studioWsVM } from '@/server/vm/studio';
export const GET = (_: Request, { params }: { params: Promise<{ id: string }> }) => handle(async () => ({ solution: await studioWsVM(await requireViewer('studio'), (await params).id) }));
