'use client';

import { FileText, Shield, LogOut, Activity, UserPlus, Users, Zap, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface ProjectSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  userEmail: string;
  projectId: string;
  userRole?: string;
}

export function ProjectSidebar({ activeTab, onTabChange, userEmail, projectId, userRole }: ProjectSidebarProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch {
      setLoggingOut(false);
    }
  };

  return (
    <aside className="w-64 bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900 h-screen sticky top-0 overflow-y-auto flex flex-col border-r border-slate-200">
      {/* Header Section */}
      <div className="p-4 border-b border-slate-200 space-y-3">
        {/* Logo & Branding */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">MedSense</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Claims Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation Section */}
      <nav className="flex-1 p-3 space-y-1">
        <button
          onClick={() => onTabChange('claims')}
          className={cn(
            'w-full flex items-start gap-3 px-3.5 py-2.5 rounded-lg transition-all duration-200',
            activeTab === 'claims'
              ? 'bg-blue-100 border-l-4 border-blue-500 shadow-sm'
              : 'hover:bg-slate-200/50 border-l-4 border-transparent'
          )}
        >
          <FileText
            className={cn(
              'h-5 w-5 mt-0.5 flex-shrink-0',
              activeTab === 'claims' ? 'text-blue-600' : 'text-slate-400'
            )}
          />
          <div className="text-left">
            <p
              className={cn(
                'font-semibold text-sm',
                activeTab === 'claims' ? 'text-blue-900' : 'text-slate-700'
              )}
            >
              Claims
            </p>
            <p className={cn('text-[11px]', activeTab === 'claims' ? 'text-blue-700' : 'text-slate-500')}>
              Review and analyze
            </p>
          </div>
        </button>

        {userRole === 'superadmin' && (
          <div className="space-y-1 pt-2">
            <div className="pt-2 pb-1 px-3.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Administration</p>
            </div>

            <button
              onClick={() => onTabChange('users')}
              className={cn(
                'w-full flex items-start gap-3 px-3.5 py-2.5 rounded-lg transition-all duration-200',
                activeTab === 'users'
                  ? 'bg-blue-100 border-l-4 border-blue-500 shadow-sm'
                  : 'hover:bg-slate-200/50 border-l-4 border-transparent'
              )}
            >
              <UserPlus
                className={cn(
                  'h-5 w-5 mt-0.5 flex-shrink-0',
                  activeTab === 'users' ? 'text-blue-600' : 'text-slate-400'
                )}
              />
              <div className="text-left">
                <p
                  className={cn(
                    'font-semibold text-sm',
                    activeTab === 'users' ? 'text-blue-900' : 'text-slate-700'
                  )}
                >
                  Add Users
                </p>
                <p className={cn('text-[11px]', activeTab === 'users' ? 'text-blue-700' : 'text-slate-500')}>
                  Create new accounts
                </p>
              </div>
            </button>

            <button
              onClick={() => onTabChange('users-mgmt')}
              className={cn(
                'w-full flex items-start gap-3 px-3.5 py-2.5 rounded-lg transition-all duration-200',
                activeTab === 'users-mgmt'
                  ? 'bg-blue-100 border-l-4 border-blue-500 shadow-sm'
                  : 'hover:bg-slate-200/50 border-l-4 border-transparent'
              )}
            >
              <Users
                className={cn(
                  'h-5 w-5 mt-0.5 flex-shrink-0',
                  activeTab === 'users-mgmt' ? 'text-blue-600' : 'text-slate-400'
                )}
              />
              <div className="text-left">
                <p
                  className={cn(
                    'font-semibold text-sm',
                    activeTab === 'users-mgmt' ? 'text-blue-900' : 'text-slate-700'
                  )}
                >
                  Users Management
                </p>
                <p className={cn('text-[11px]', activeTab === 'users-mgmt' ? 'text-blue-700' : 'text-slate-500')}>
                  Roles & status
                </p>
              </div>
            </button>

            <button
              onClick={() => onTabChange('claims-auto')}
              className={cn(
                'w-full flex items-start gap-3 px-3.5 py-2.5 rounded-lg transition-all duration-200',
                activeTab === 'claims-auto'
                  ? 'bg-blue-100 border-l-4 border-blue-500 shadow-sm'
                  : 'hover:bg-slate-200/50 border-l-4 border-transparent'
              )}
            >
              <Zap
                className={cn(
                  'h-5 w-5 mt-0.5 flex-shrink-0',
                  activeTab === 'claims-auto' ? 'text-blue-600' : 'text-slate-400'
                )}
              />
              <div className="text-left">
                <p
                  className={cn(
                    'font-semibold text-sm',
                    activeTab === 'claims-auto' ? 'text-blue-900' : 'text-slate-700'
                  )}
                >
                  Claims Auto Assignment
                </p>
                <p className={cn('text-[11px]', activeTab === 'claims-auto' ? 'text-blue-700' : 'text-slate-500')}>
                  Configure limits & load
                </p>
              </div>
            </button>

            <button
              onClick={() => onTabChange('process-monitor')}
              className={cn(
                'w-full flex items-start gap-3 px-3.5 py-2.5 rounded-lg transition-all duration-200',
                activeTab === 'process-monitor'
                  ? 'bg-blue-100 border-l-4 border-blue-500 shadow-sm'
                  : 'hover:bg-slate-200/50 border-l-4 border-transparent'
              )}
            >
              <Activity
                className={cn(
                  'h-5 w-5 mt-0.5 flex-shrink-0',
                  activeTab === 'process-monitor' ? 'text-blue-600' : 'text-slate-400'
                )}
              />
              <div className="text-left">
                <p
                  className={cn(
                    'font-semibold text-sm',
                    activeTab === 'process-monitor' ? 'text-blue-900' : 'text-slate-700'
                  )}
                >
                  Admin Dashboard
                </p>
                <p className={cn('text-[11px]', activeTab === 'process-monitor' ? 'text-blue-700' : 'text-slate-500')}>
                  Overview, queue & uploads
                </p>
              </div>
            </button>

            <button
              onClick={() => onTabChange('user-analytics')}
              className={cn(
                'w-full flex items-start gap-3 px-3.5 py-2.5 rounded-lg transition-all duration-200',
                activeTab === 'user-analytics'
                  ? 'bg-blue-100 border-l-4 border-blue-500 shadow-sm'
                  : 'hover:bg-slate-200/50 border-l-4 border-transparent'
              )}
            >
              <BarChart3
                className={cn(
                  'h-5 w-5 mt-0.5 flex-shrink-0',
                  activeTab === 'user-analytics' ? 'text-blue-600' : 'text-slate-400'
                )}
              />
              <div className="text-left">
                <p
                  className={cn(
                    'font-semibold text-sm',
                    activeTab === 'user-analytics' ? 'text-blue-900' : 'text-slate-700'
                  )}
                >
                  User Analytics
                </p>
                <p className={cn('text-[11px]', activeTab === 'user-analytics' ? 'text-blue-700' : 'text-slate-500')}>
                  Reviewer performance metrics
                </p>
              </div>
            </button>
          </div>
        )}
      </nav>

      {/* User & Footer Section */}
      <div className="border-t border-slate-200 p-3 space-y-2.5">
        {/* User Profile */}
        <div className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-1.5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">User Account</p>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center border border-blue-400/30 flex-shrink-0">
              <span className="text-xs font-bold text-white">{userEmail.charAt(0).toUpperCase()}</span>
            </div>
            <span className="text-xs text-slate-700 truncate flex-1">{userEmail}</span>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 text-red-600 hover:text-red-700 font-medium text-xs transition-all duration-200 disabled:opacity-50"
        >
          <LogOut className="w-3.5 h-3.5" />
          {loggingOut ? 'Signing out...' : 'Sign out'}
        </button>
      </div>
    </aside>
  );
}
