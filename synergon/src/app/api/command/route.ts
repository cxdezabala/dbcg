import { handle } from '@/server/api';
import { requireViewer } from '@/server/session';
import { commandVM } from '@/server/vm/command';
export const GET = () => handle(async () => ({ command: await commandVM(await requireViewer('command')) }));
