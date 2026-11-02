import { requirePageViewer } from '@/server/session';
import { PageHeader } from '@/components/shell/PageHeader';
import { viewHeader } from '@/lib/views';

export default async function HomePage() {
  const v = await requirePageViewer('home');
  return <PageHeader {...viewHeader('home', v.role, v.first)} />;
}
