import { connectToDatabase } from '@/lib/mongodb';
import { serializeDocument, serializeDocuments } from '@/lib/serialize';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { ZeroProceduresList } from '@/components/dashboard/zero-procedures-list';

interface Project {
  _id: string;
  tenant_id: string;
  project_id: string;
  project_name: string;
  description?: string;
  created_at?: string;
}

export default async function ZeroProceduresPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  let projects: Project[] = [];
  let currentProject: Project | null = null;
  let error: string | null = null;

  try {
    const { db } = await connectToDatabase();
    const projectsCollection = db.collection('projects');

    const rawProjects = await projectsCollection
      .find({})
      .sort({ created_at: -1 })
      .toArray();

    projects = serializeDocuments(rawProjects) as Project[];

    const rawProject = await projectsCollection.findOne({
      project_id: projectId,
    });

    currentProject = rawProject ? (serializeDocument(rawProject) as Project) : null;

    if (!currentProject) {
      error = 'Project not found';
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to fetch project';
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar projects={projects} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title={currentProject?.project_name || 'Project'}
          breadcrumbs={[
            { label: 'Projects', href: '/' },
            { label: currentProject?.project_name || 'Loading...', href: `/projects/${projectId}` },
            { label: 'Zero Procedures' },
          ]}
        />
        <main className="flex-1 overflow-auto p-8">
          {error ? (
            <div className="text-center py-12">
              <p className="text-destructive font-medium">Error: {error}</p>
            </div>
          ) : (
            <ZeroProceduresList projectId={projectId} />
          )}
        </main>
      </div>
    </div>
  );
}
