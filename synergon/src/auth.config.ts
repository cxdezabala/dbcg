// Edge-safe Auth.js configuration (used by middleware). No database access here.
import type { NextAuthConfig } from 'next-auth';
import { NextResponse } from 'next/server';
import { canView, homeFor, isView } from '@/lib/rbac';
import type { Role } from '@/lib/demo/types';

export const authConfig = {
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  trustHost: true,
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const u = user as { id?: string; role?: Role; teamId?: string | null; orgId?: string };
        token.uid = u.id; token.role = u.role; token.teamId = u.teamId ?? null; token.orgId = u.orgId;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.uid as string;
      session.user.role = token.role as Role;
      session.user.teamId = (token.teamId as string | null) ?? null;
      session.user.orgId = token.orgId as string;
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const role = auth?.user?.role as Role | undefined;
      if (pathname.startsWith('/api/auth') || pathname === '/login') return true;
      if (!role) {
        if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
        return false; // → redirect to /login
      }
      const seg = pathname.split('/')[1] || '';
      if (seg === '') return NextResponse.redirect(new URL('/' + homeFor(role), request.nextUrl));
      if (isView(seg) && !canView(role, seg)) return NextResponse.redirect(new URL('/' + homeFor(role) + '?denied=' + seg, request.nextUrl));
      return true;
    },
  },
} satisfies NextAuthConfig;
