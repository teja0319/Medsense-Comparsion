'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils';

interface Project {
  _id: string;
  tenant_id: string;
  project_id: string;
  project_name: string;
  description?: string;
  created_at?: string;
}

interface SidebarProps {
  projects: Project[];
}

export function Sidebar({ projects }: SidebarProps) {
  const params = useParams();
  const currentProjectId = params.projectId as string;

  return (
    <aside className="w-64 border-r border-border/50 bg-sidebar/50 backdrop-blur-sm flex flex-col h-screen">
      <div className="p-6 border-b border-border/30">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <div className="w-4 h-4 rounded bg-primary"></div>
          </div>
          <h1 className="text-xl font-bold text-foreground">Medsense</h1>
        </div>
        <p className="text-xs text-muted-foreground">Read-Only Dashboard</p>
      </div>

      <nav className="px-4 py-4 border-b border-border/30">
        <Link
          href="/"
          className={cn(
            'block px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
            !currentProjectId
              ? 'bg-primary/15 text-primary border border-primary/30'
              : 'text-foreground/70 hover:text-foreground hover:bg-accent/10'
          )}
        >
          All Projects
        </Link>
      </nav>

      <div className="px-4 py-4 flex-1 overflow-hidden flex flex-col">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
          Projects
        </h2>
        <div className="space-y-1 overflow-y-auto flex-1">
          {projects.length === 0 ? (
            <p className="text-xs text-muted-foreground p-2">No projects found</p>
          ) : (
            projects.map((project) => (
              <Link
                key={project._id}
                href={`/projects/${project.project_id}`}
                className={cn(
                  'block px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 truncate',
                  currentProjectId === project.project_id
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'text-foreground/60 hover:text-foreground hover:bg-accent/10'
                )}
                title={project.project_name}
              >
                {project.project_name}
              </Link>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
