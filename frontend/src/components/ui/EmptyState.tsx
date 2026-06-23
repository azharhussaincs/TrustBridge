import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
  variant?: 'light' | 'dark';
}

export function EmptyState({
  icon = '📭',
  title,
  description,
  className,
  children,
  variant = 'light',
}: EmptyStateProps) {
  const isDark = variant === 'dark';

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 py-12 text-center',
        className
      )}
    >
      <span className="text-4xl mb-4" aria-hidden="true">{icon}</span>
      <p className={cn('text-sm font-medium', isDark ? 'text-blue-100' : 'text-blue-100')}>
        {title}
      </p>
      {description && (
        <p className={cn('mt-1 text-sm', isDark ? 'text-blue-200/70' : 'text-blue-200/70')}>
          {description}
        </p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
