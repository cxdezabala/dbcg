import { handle } from '@/server/api';
import { requireViewer } from '@/server/session';
import { search } from '@/server/search';
export const GET = (req: Request) => handle(async () => ({ results: await search(await requireViewer(), new URL(req.url).searchParams.get('q') || '') }));
