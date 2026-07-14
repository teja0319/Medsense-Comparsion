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
          <div className="h-full cursor-pointer relative overflow-hidden bg-white/80 backdrop-blur-md border border-slate-200/60 hover:border-primary/45 rounded-2xl p-6 shadow-md hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1">
            {/* Top card glowing highlight line */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="flex items-start justify-between gap-4 mb-4">
              <h3 className="text-base font-bold text-slate-800 group-hover:text-primary transition-colors duration-200 line-clamp-2">
                {project.project_name}
              </h3>
              <div className="w-8 h-8 rounded-xl bg-primary/5 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors border border-primary/20 shadow-xs">
                <ArrowRight className="w-4 h-4 text-primary" />
              </div>
            </div>

            <div className="space-y-4">
              {project.description && (
                <p className="text-slate-500 text-xs font-semibold leading-relaxed line-clamp-2">
                  {project.description}
                </p>
              )}
              
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs">
                {project.created_at ? (
                  <span className="text-slate-400 font-semibold">
                    Created {new Date(project.created_at).toLocaleDateString()}
                  </span>
                ) : (
                  <span />
                )}
                <span className="inline-flex items-center gap-1 text-primary font-bold hover:gap-2 transition-all">
                  Open Project
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
