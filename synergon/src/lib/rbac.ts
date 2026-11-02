// Role-based access (port of ROLE_INFO / ACCESS from synergon-data.js). Enforced server-side in
// middleware (route level) and again in every data-access function (query level).
import type { Role, View } from './demo/types';

export const ALL_VIEWS: View[] = ['home', 'ci', 'radar', 'studio', 'growth', 'collab', 'command', 'settings'];
export const ACCESS: Record<Role, View[]> = {
  exec: ALL_VIEWS.filter(x => x !== 'command'),
  lead: ALL_VIEWS,
  director: ALL_VIEWS,
  admin: ['settings'],
};
export const BUSINESS_ROLES: Role[] = ['exec', 'lead', 'director'];
export const canView = (role: Role, view: View) => ACCESS[role]?.includes(view) ?? false;
export const homeFor = (role: Role): View => (role === 'admin' ? 'settings' : 'home');
export const isView = (s: string): s is View => (ALL_VIEWS as string[]).includes(s);
