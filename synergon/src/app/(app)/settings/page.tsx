import { requirePageViewer } from '@/server/session';
import { PageHeader } from '@/components/shell/PageHeader';
import { viewHeader } from '@/lib/views';
import { settingsVM } from '@/server/vm/settings';
import { SettingsView } from '@/components/settings/SettingsView';
import { cookies } from 'next/headers';

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string; denied?: string }> }) {
  const v = await requirePageViewer('settings');
  const sp = await searchParams;
  const dark = (await cookies()).get('theme')?.value === 'dark';
  return <><PageHeader {...viewHeader('settings', v.role, v.first)} /><SettingsView vm={await settingsVM(v)} tab={sp.tab || null} dark={dark} denied={sp.denied || null} /></>;
}
