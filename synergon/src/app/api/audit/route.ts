import { handle } from '@/server/api';
import { requireViewer } from '@/server/session';
import { settingsVM } from '@/server/vm/settings';
import { ForbiddenError } from '@/server/errors';
export const GET = () => handle(async () => { const s = await settingsVM(await requireViewer('settings')); if (!s.audit) throw new ForbiddenError('Audit log is restricted to administrators'); return { audit: s.audit }; });
