import { handle } from '@/server/api';
import { requireViewer } from '@/server/session';
import { getAccount } from '@/server/data/accounts';
export const GET = (_: Request, { params }: { params: Promise<{ id: string }> }) => handle(async () => ({ account: await getAccount(await requireViewer('ci'), (await params).id) }));
