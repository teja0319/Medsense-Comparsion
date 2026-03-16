import { connectToDatabase } from '@/lib/mongodb';
import { serializeDocument, serializeDocuments } from '@/lib/serialize';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { JobsTable } from '@/components/dashboard/jobs-table';

interface Project {
  _id: string;
  tenant_id: string;
  project_id: string;
  project_name: string;
  description?: string;
  created_at?: string;
}

export default async function ProjectPage({
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

    // Fetch all projects for sidebar
    const rawProjects = await projectsCollection
      .find({})
      .sort({ created_at: -1 })
      .toArray();
    
    projects = serializeDocuments(rawProjects) as Project[];

    // Fetch current project
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
            { label: currentProject?.project_name || 'Loading...' },
          ]}
        />
        <main className="flex-1 overflow-auto p-8">
          {error ? (
            <div className="text-center py-12">
              <p className="text-destructive font-medium">Error: {error}</p>
            </div>
          ) : (
            <div>
              <div className="mb-8">
                {currentProject?.description && (
                  <p className="text-muted-foreground">{currentProject.description}</p>
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-6">Parsing Jobs</h2>
                <JobsTable projectId={projectId} />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
