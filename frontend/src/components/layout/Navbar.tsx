'use client';

import { cn } from '@/lib/utils';

type NavbarVariant = 'light' | 'admin' | 'team-lead' | 'super-user';

interface NavbarProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  variant?: NavbarVariant;
  children?: React.ReactNode;
  className?: string;
}

const variantStyles: Record<NavbarVariant, { bar: string; title: string; subtitle: string }> = {
  light: {
    bar: 'bg-gradient-to-r from-blue-950/95 via-blue-900/95 to-blue-950/95 border-b border-blue-400/25 shadow-lg backdrop-blur-xl',
    title: 'text-white',
    subtitle: 'text-blue-200/80',
  },
  admin: {
    bar: 'bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border-b border-blue-500/30 shadow-lg backdrop-blur-xl',
    title: 'text-white',
    subtitle: 'text-blue-200/70',
  },
  'team-lead': {
    bar: 'bg-gradient-to-r from-blue-900 via-emerald-900/90 to-blue-900 border-b border-emerald-400/30 shadow-lg backdrop-blur-xl',
    title: 'text-white',
    subtitle: 'text-emerald-100/80',
  },
  'super-user': {
    bar: 'bg-gradient-to-r from-blue-950 via-slate-900 to-amber-950/80 border-b-2 border-amber-400/60 shadow-lg backdrop-blur-xl',
    title: 'text-amber-300',
    subtitle: 'text-blue-200/70',
  },
};

export function Navbar({ title, subtitle, variant = 'light', children, className }: NavbarProps) {
  const styles = variantStyles[variant];

  return (
    <nav className={cn('sticky top-0 z-40', styles.bar, className)}>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:h-16 lg:py-0">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="min-w-0">
            <h1 className={cn('truncate text-lg font-bold sm:text-xl', styles.title)}>
              {title}
            </h1>
            {subtitle && (
              <div className={cn('mt-0.5 text-xs sm:text-sm', styles.subtitle)}>{subtitle}</div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {children}
        </div>
      </div>
    </nav>
  );
}

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'default' | 'wide';
}

export function PageContainer({ children, className, maxWidth = 'default' }: PageContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto px-4 py-6 sm:px-6 sm:py-8',
        maxWidth === 'default' ? 'max-w-7xl' : 'max-w-[90rem]',
        className
      )}
    >
      {children}
    </div>
  );
}
