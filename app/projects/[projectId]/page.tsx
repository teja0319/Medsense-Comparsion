import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { ProjectDashboard } from '@/components/dashboard/project-dashboard';

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return <ProjectDashboard projectId={projectId} userEmail={user.email} userRole={user.role} />;
}
