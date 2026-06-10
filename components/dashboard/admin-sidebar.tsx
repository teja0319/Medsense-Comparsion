'use client';

import { Users, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
  const tabs = [
    {
      id: 'users',
      label: 'Users',
      icon: Users,
      description: 'Roles & access',
    },
    {
      id: 'claims-auto',
      label: 'Claims',
      icon: Zap,
      description: 'Auto assignment',
    },
  ];

  return (
    <aside className="w-[220px] min-w-[220px] bg-gradient-to-b from-slate-900 to-slate-950 h-screen sticky top-0 flex flex-col shadow-xl">
      {/* Header */}
      <div className="px-4 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white tracking-tight">Admin</h2>
            <p className="text-[10px] text-slate-400 leading-tight">Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">
          Manage
        </p>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                isActive
                  ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/10 border border-blue-500/30 shadow-sm shadow-blue-500/10'
                  : 'hover:bg-white/5 border border-transparent'
              )}
            >
              <div
                className={cn(
                  'w-7 h-7 rounded-md flex items-center justify-center transition-all duration-200',
                  isActive
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-white/5 text-slate-400 group-hover:text-slate-300 group-hover:bg-white/10'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="text-left min-w-0">
                <p
                  className={cn(
                    'text-xs font-medium leading-tight truncate',
                    isActive ? 'text-blue-300' : 'text-slate-300 group-hover:text-white'
                  )}
                >
                  {tab.label}
                </p>
                <p
                  className={cn(
                    'text-[10px] leading-tight truncate',
                    isActive ? 'text-blue-400/70' : 'text-slate-500'
                  )}
                >
                  {tab.description}
                </p>
              </div>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-sm shadow-blue-400/50" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/5">
        <p className="text-[10px] text-slate-600">MedSense v2.0</p>
      </div>
    </aside>
  );
}
