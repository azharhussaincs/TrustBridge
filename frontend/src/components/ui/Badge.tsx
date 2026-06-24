import { cn } from '@/lib/utils';
import { getRoleBadgeStyle } from '@/lib/roles';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'role';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  role?: string;
  className?: string;
}

const variantStyles: Record<Exclude<BadgeVariant, 'role'>, string> = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
};

export function Badge({ children, variant = 'default', role, className }: BadgeProps) {
  const roleStyle = variant === 'role' && role ? getRoleBadgeStyle(role) : '';
  const variantStyle =
    variant === 'role'
      ? roleStyle || variantStyles.default
      : variantStyles[variant as Exclude<BadgeVariant, 'role'>];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        className,
        variantStyle
      )}
    >
      {children}
    </span>
  );
}

export function StatusDot({ online }: { online: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span
        className={cn(
          'h-2 w-2 rounded-full',
          online ? 'bg-emerald-500' : 'bg-slate-300'
        )}
        aria-hidden="true"
      />
      <span className={online ? 'text-emerald-300' : 'text-card-muted'}>
        {online ? 'Online' : 'Offline'}
      </span>
    </span>
  );
}
