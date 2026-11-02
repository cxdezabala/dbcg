import { handle } from '@/server/api';
import { requireViewer } from '@/server/session';
import { settingsVM } from '@/server/vm/settings';
export const GET = () => handle(async () => ({ settings: await settingsVM(await requireViewer('settings')) }));
