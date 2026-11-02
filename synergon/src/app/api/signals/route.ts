import { handle } from '@/server/api';
import { requireViewer } from '@/server/session';
import { signalsVM } from '@/server/data/radar';
export const GET = () => handle(async () => { const s = await signalsVM(await requireViewer('radar')); return { signals: s.signals, connectable: s.sel.connect.map(c => c.id) }; });
