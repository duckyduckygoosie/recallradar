import { SourceStatusPanel } from '@/components/source-status';
import { WorkspacePage } from '@/components/workspace-page';

export default function HomePage() {
  return <><SourceStatusPanel /><WorkspacePage view="overview" /></>;
}
