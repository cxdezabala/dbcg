import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';
import bcrypt from 'bcryptjs';
import { authConfig } from './auth.config';
import { db } from '@/server/db';
import { DEMO_USERS } from '@/server/seed';
import type { Role } from '@/lib/demo/types';

export const demoMode = () => process.env.DEMO_MODE === 'true';

const toSessionUser = (u: { id: string; name: string; email: string | null; role: string; teamId: string | null; orgId: string }) =>
  ({ id: u.id, name: u.name, email: u.email, role: u.role as Role, teamId: u.teamId, orgId: u.orgId });

const providers = [
  Credentials({
    id: 'credentials',
    name: 'Email and password',
    credentials: { email: { label: 'Email' }, password: { label: 'Password', type: 'password' } },
    async authorize(c) {
      const email = String(c?.email || '').toLowerCase().trim();
      const u = await db.user.findUnique({ where: { email } });
      if (!u || !u.canLogin || !u.passwordHash) return null;
      if (!(await bcrypt.compare(String(c?.password || ''), u.passwordHash))) return null;
      return toSessionUser(u);
    },
  }),
  // Demo-role switcher: signs in as one of the 4 demo users without a password. Only active when DEMO_MODE=true.
  Credentials({
    id: 'demo-switch',
    name: 'Demo role',
    credentials: { role: { label: 'Role' } },
    async authorize(c) {
      if (!demoMode()) return null;
      const role = String(c?.role || '') as keyof typeof DEMO_USERS;
      const du = DEMO_USERS[role];
      if (!du) return null;
      const u = await db.user.findUnique({ where: { id: du.id } });
      return u ? toSessionUser(u) : null;
    },
  }),
  // SSO prepared: Microsoft Entra ID is enabled when the three AUTH_MICROSOFT_ENTRA_ID_* variables are set.
  // TODO(production): map the Entra object id / email to a provisioned SYNERGON user and role (SCIM).
  ...(process.env.AUTH_MICROSOFT_ENTRA_ID_ID && process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET && process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER
    ? [MicrosoftEntraID({ clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID, clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET, issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER })]
    : []),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider === 'microsoft-entra-id') {
        const u = user.email ? await db.user.findUnique({ where: { email: user.email.toLowerCase() } }) : null;
        if (!u || !u.canLogin) return false;
        Object.assign(user, toSessionUser(u));
      }
      return true;
    },
  },
});
