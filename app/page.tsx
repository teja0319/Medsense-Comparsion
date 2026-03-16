import { connectToDatabase } from '@/lib/mongodb';
import { serializeDocuments } from '@/lib/serialize';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { ProjectList } from '@/components/dashboard/project-list';

interface Project {
  _id: string;
  tenant_id: string;
  project_id: string;
  project_name: string;
  description?: string;
  created_at?: string;
}

export default async function Home() {
  let projects: Project[] = [];
  let error: string | null = null;

  try {
    const { db } = await connectToDatabase();
    const projectsCollection = db.collection('projects');

    // Fetch all projects
    const rawProjects = await projectsCollection
      .find({})
      .sort({ created_at: -1 })
      .toArray();

    // Serialize Medsense documents for client components
    projects = serializeDocuments(rawProjects) as Project[];
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to fetch projects';
  }

  return (
    <div className="flex h-screen bg-gradient-to-b from-background to-background/80">
      <Sidebar projects={projects} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Projects" />
        <main className="flex-1 overflow-auto p-8 space-y-6">
          {error ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-destructive/15 mb-4">
                  <span className="text-destructive text-lg">!</span>
                </div>
                <p className="text-destructive font-semibold">Connection Error</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Please check your Medsense connection and environment variables.
                </p>
              </div>
            </div>
          ) : projects.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="text-4xl mb-4">📦</div>
                <p className="text-lg font-semibold text-foreground">No Projects Found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Add a project to your Medsense to get started.
                </p>
              </div>
            </div>
          ) : (
            <ProjectList projects={projects} />
          )}
        </main>
      </div>
    </div>
  );
}
