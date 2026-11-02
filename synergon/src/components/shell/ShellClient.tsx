'use client';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { UIProvider } from './UIProvider';
import { AIPanel } from './AIPanel';
import { isView } from '@/lib/rbac';

export function ShellClient({ children, suggest, viewNames, roleTitle, isAdmin }: {
  children: ReactNode; suggest: Record<string, string[]>; viewNames: Record<string, string>; roleTitle: string; isAdmin: boolean;
}) {
  const seg = usePathname().split('/')[1] || 'home';
  const view = isView(seg) ? seg : 'home';
  const suggestions = isAdmin ? suggest.settings : (suggest[view] || suggest.home);
  return (
    <UIProvider view={view}>
      {children}
      <AIPanel context={viewNames[view] + ' · ' + roleTitle} suggestions={suggestions} />
    </UIProvider>
  );
}
