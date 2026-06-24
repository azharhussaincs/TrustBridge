'use client';

import { Button } from '@/components/ui/Button';

interface NavDashboardLinkProps {
  label?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/** Hard-navigate to dashboard (avoids flaky Link+button nesting and client router.push). */
export function NavDashboardLink({
  label = 'Dashboard',
  variant = 'secondary',
  size = 'sm',
  className,
}: NavDashboardLinkProps) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={() => window.location.assign('/dashboard')}
    >
      {label}
    </Button>
  );
}
