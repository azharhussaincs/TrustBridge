import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  fullScreen?: boolean;
}

const sizeMap = {
  sm: 'h-6 w-6 border-2',
  md: 'h-10 w-10 border-[3px]',
  lg: 'h-12 w-12 border-4',
};

export function LoadingSpinner({
  message = 'Loading...',
  size = 'md',
  className,
  fullScreen = false,
}: LoadingSpinnerProps) {
  const content = (
    <div className={cn('flex flex-col items-center justify-center text-center', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-brand-600 border-t-transparent',
          sizeMap[size]
        )}
        role="status"
        aria-label={message}
      />
      {message && (
        <p className="mt-4 text-sm text-card-muted">{message}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="page-shell flex min-h-screen items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}
