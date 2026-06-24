import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'dark' | 'light';
}

const paddingMap = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({ children, className, padding = 'md', variant = 'dark' }: CardProps) {
  return (
    <div
      className={cn(
        variant === 'light' ? 'card-elevated-light' : 'card-elevated',
        'animate-fade-in',
        paddingMap[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  variant?: 'dark' | 'light';
}

export function CardHeader({ title, description, action, className, variant = 'dark' }: CardHeaderProps) {
  const isLight = variant === 'light';

  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-4 mb-5', className)}>
      <div>
        <h2 className={cn('text-lg font-semibold', isLight ? 'text-slate-900' : 'text-white')}>{title}</h2>
        {description && (
          <p className={cn('mt-1 text-sm', isLight ? 'text-slate-600' : 'text-blue-200/80')}>{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
