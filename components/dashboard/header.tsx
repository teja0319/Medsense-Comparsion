'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface HeaderProps {
  title: string;
  breadcrumbs?: Breadcrumb[];
}

export function Header({ title, breadcrumbs }: HeaderProps) {
  return (
    <header className="border-b border-border/50 bg-background/50 backdrop-blur-sm sticky top-0 z-40">
      <div className="px-8 py-5">
        <div className="flex items-center gap-2 mb-3">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="flex items-center gap-2 text-sm">
              {breadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center gap-2">
                  {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />}
                  {crumb.href ? (
                    <Link href={crumb.href} className="text-muted-foreground/70 hover:text-foreground transition-colors font-medium">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-foreground font-semibold">{crumb.label}</span>
                  )}
                </div>
              ))}
            </nav>
          )}
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">{title}</h1>
      </div>
    </header>
  );
}
