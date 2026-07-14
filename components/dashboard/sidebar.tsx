'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Folder, Briefcase, ChevronRight } from 'lucide-react';

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
    <aside className="w-64 my-4 ml-4 mr-2 bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-2xl flex flex-col h-[calc(100vh-2rem)] shrink-0 shadow-lg shadow-slate-100/40">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/10">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C12 7.5 16.5 12 22 12C16.5 12 12 16.5 12 22C12 16.5 7.5 12 2 12C7.5 12 12 7.5 12 2Z" />
              <path d="M18 3C18 5 19.5 6.5 21.5 6.5C19.5 6.5 18 8 18 10C18 8 16.5 6.5 14.5 6.5C16.5 6.5 18 5 18 3Z" opacity="0.85" />
              <path d="M6 14C6 15.5 7 16.5 8.5 16.5C7 16.5 6 17.5 6 19C6 17.5 5 16.5 3.5 16.5C5 16.5 6 15.5 6 14Z" opacity="0.7" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800 tracking-tight leading-tight">Medsense</h1>
            <p className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase">Dashboard</p>
          </div>
        </div>
      </div>

      {/* Main Nav */}
      <nav className="px-3 py-4 border-b border-slate-100">
        <Link
          href="/"
          className={cn(
            'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border',
            !currentProjectId
              ? 'bg-primary/5 text-primary border-primary/20 shadow-xs shadow-primary/5'
              : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-50'
          )}
        >
          <Folder className="w-4 h-4 shrink-0" />
          <span>All Projects</span>
        </Link>
      </nav>

      {/* Projects List */}
      <div className="px-3 py-4 flex-1 overflow-hidden flex flex-col">
        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3.5 px-3">
          Projects
        </h2>
        <div className="space-y-1 overflow-y-auto flex-1 pr-1">
          {projects.length === 0 ? (
            <p className="text-xs text-slate-400 px-3 py-2 italic">No projects found</p>
          ) : (
            projects.map((project) => {
              const isActive = currentProjectId === project.project_id;
              return (
                <Link
                  key={project._id}
                  href={`/projects/${project.project_id}`}
                  className={cn(
                    'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 truncate border group',
                    isActive
                      ? 'bg-primary/5 text-primary border-primary/20 shadow-xs shadow-primary/5'
                      : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-50'
                  )}
                  title={project.project_name}
                >
                  <div className="flex items-center gap-3 truncate">
                    <Briefcase className={cn('w-4 h-4 shrink-0', isActive ? 'text-primary' : 'text-slate-400 group-hover:text-slate-500')} />
                    <span className="truncate">{project.project_name}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 shrink-0 text-primary/70" />}
                </Link>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
}
