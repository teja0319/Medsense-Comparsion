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

const ALLOWED_PROJECT_IDS = [
  '40eeabbd-a303-4389-90a0-8b0984430d99',
  '40eeabbd-a303-4389-90a0-8b0984430ddd',
  '40eeabbd-a303-4389-90a0-8b09844301cd',
  '32a8cce6-eacc-4c8b-af54-9a341609d6b2',
];

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

    // Fetch only allowed projects for sidebar
    const rawProjects = await projectsCollection
      .find({ project_id: { $in: ALLOWED_PROJECT_IDS } })
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
    <div className="flex h-screen bg-transparent overflow-hidden">
      <Sidebar projects={projects} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title={currentProject?.project_name || 'Project'}
          breadcrumbs={[
            { label: 'Projects', href: '/' },
            { label: currentProject?.project_name || 'Loading...' },
          ]}
        />
        <main className="flex-1 overflow-auto pl-2 pr-4 pb-4 pt-0">
          {error ? (
            <div className="text-center py-12">
              <p className="text-destructive font-medium">Error: {error}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentProject?.description && (
                <div className="px-6 py-3 rounded-2xl bg-white/[0.02] border border-white/[0.04] backdrop-blur-md">
                  <p className="text-xs text-slate-400 font-semibold">{currentProject.description}</p>
                </div>
              )}
              <div className="p-1">
                <JobsTable projectId={projectId} />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
