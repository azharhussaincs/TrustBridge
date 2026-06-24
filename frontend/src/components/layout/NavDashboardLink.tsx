'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';

interface NavDashboardLinkProps {
  label?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/** Reliable navigation to the shared dashboard hub (avoids flaky client router.push). */
export function NavDashboardLink({
  label = 'Dashboard',
  variant = 'secondary',
  size = 'sm',
  className,
}: NavDashboardLinkProps) {
  return (
    <Link href="/dashboard" prefetch className="inline-flex">
      <Button type="button" variant={variant} size={size} className={className}>
        {label}
      </Button>
    </Link>
  );
}
