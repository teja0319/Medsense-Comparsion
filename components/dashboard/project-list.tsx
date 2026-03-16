'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';

interface Project {
  _id: string;
  tenant_id: string;
  project_id: string;
  project_name: string;
  description?: string;
  created_at?: string;
}

interface ProjectListProps {
  projects: Project[];
}

export function ProjectList({ projects }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-muted-foreground text-lg">No projects found</p>
          <p className="text-sm text-muted-foreground mt-2">
            Add a project to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => (
        <Link
          key={project._id}
          href={`/projects/${project.project_id}`}
          className="group"
        >
          <Card className="h-full cursor-pointer transition-all duration-300 hover:shadow-xl hover:border-primary/50 border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <CardTitle className="text-xl group-hover:text-primary transition-colors duration-200 line-clamp-2">
                  {project.project_name}
                </CardTitle>
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/25 transition-colors">
                  <ArrowRight className="w-4 h-4 text-primary" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.description && (
                <p className="text-muted-foreground text-sm line-clamp-2">
                  {project.description}
                </p>
              )}
              {project.created_at && (
                <p className="text-xs text-muted-foreground/70">
                  Created {new Date(project.created_at).toLocaleDateString()}
                </p>
              )}
              <div className="pt-2 border-t border-border/30">
                <span className="inline-flex items-center gap-2 text-primary font-medium text-sm group-hover:gap-3 transition-all">
                  View Jobs <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
