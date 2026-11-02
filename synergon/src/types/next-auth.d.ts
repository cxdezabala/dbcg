import type { Role } from '@/lib/demo/types';
import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: { id: string; role: Role; teamId: string | null; orgId: string; name?: string | null; email?: string | null };
  }
}
