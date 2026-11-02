import { handle } from '@/server/api';
import { requireViewer } from '@/server/session';
import { ACCESS } from '@/lib/rbac';
export const GET = () => handle(async () => { const v = await requireViewer(); return { id: v.id, name: v.name, role: v.role, title: v.title, views: ACCESS[v.role] }; });
