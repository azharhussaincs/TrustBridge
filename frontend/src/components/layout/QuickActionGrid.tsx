import Link from 'next/link';
import { cn } from '@/lib/utils';

interface QuickAction {
  href: string;
  icon: string;
  title: string;
  description: string;
  accent?: string;
}

interface QuickActionGridProps {
  actions: QuickAction[];
  className?: string;
}

export function QuickActionGrid({ actions, className }: QuickActionGridProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className={cn(
            'group relative overflow-hidden rounded-2xl card-elevated-light p-5 transition-all duration-200',
            'hover:-translate-y-1 hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500'
          )}
        >
          <div
            className={cn(
              'mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-2xl transition-transform duration-200 group-hover:scale-110',
              action.accent ?? 'bg-brand-50 text-brand-600 ring-1 ring-brand-100'
            )}
          >
            {action.icon}
          </div>
          <h3 className="font-semibold text-slate-900">{action.title}</h3>
          <p className="mt-1 text-sm text-slate-500">{action.description}</p>
          <span className="mt-3 inline-flex items-center text-sm font-medium text-brand-600 opacity-0 transition-opacity group-hover:opacity-100">
            Open →
          </span>
        </Link>
      ))}
    </div>
  );
}
