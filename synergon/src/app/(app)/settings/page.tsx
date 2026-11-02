import { requirePageViewer } from '@/server/session';
import { PageHeader } from '@/components/shell/PageHeader';
import { viewHeader } from '@/lib/views';

export default async function SettingsPage() {
  const v = await requirePageViewer('settings');
  return <PageHeader {...viewHeader('settings', v.role, v.first)} />;
}
