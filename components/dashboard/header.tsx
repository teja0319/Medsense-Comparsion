'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ChevronRight, LogOut, Loader2 } from 'lucide-react';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface HeaderProps {
  title: string;
  breadcrumbs?: Breadcrumb[];
}

export function Header({ title, breadcrumbs }: HeaderProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 my-4 mr-4 ml-2 bg-white/70 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-lg shadow-slate-200/30 shrink-0">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {breadcrumbs && breadcrumbs.length > 0 && (
                <nav className="flex items-center gap-1.5 text-xs">
                  {breadcrumbs.map((crumb, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                      {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-300" />}
                      {crumb.href ? (
                        <Link href={crumb.href} className="text-slate-400 hover:text-slate-800 transition-colors font-medium">
                          {crumb.label}
                        </Link>
                      ) : (
                        <span className="text-slate-800 font-semibold">{crumb.label}</span>
                      )}
                    </div>
                  ))}
                </nav>
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
          </div>
          
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-800 bg-slate-100/60 border border-slate-200/80 hover:bg-primary/10 hover:border-primary/30 hover:shadow-[0_0_10px_rgba(59,130,246,0.1)] transition-all duration-200 disabled:opacity-50"
          >
            {loggingOut ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            ) : (
              <LogOut className="w-4 h-4 text-slate-400 group-hover:text-slate-800" />
            )}
            {loggingOut ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      </div>
    </header>
  );
}
