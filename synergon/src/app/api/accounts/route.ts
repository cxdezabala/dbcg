import { handle } from '@/server/api';
import { requireViewer } from '@/server/session';
import { listAccounts } from '@/server/data/accounts';
export const GET = () => handle(async () => ({ accounts: await listAccounts(await requireViewer('ci')) }));
