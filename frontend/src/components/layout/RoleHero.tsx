import { cn } from '@/lib/utils';
import {
  getRoleIcon,
  getRoleLabel,
  ROLE_DESCRIPTIONS,
  ROLE_GRADIENTS,
  ROLE_PERMISSIONS,
  type UserRole,
} from '@/lib/roles';

interface RoleHeroProps {
  role: string;
  name: string;
  username?: string;
  className?: string;
  dark?: boolean;
}

export function RoleHero({ role, name, username, className, dark }: RoleHeroProps) {
  const userRole = role as UserRole;
  const gradient = ROLE_GRADIENTS[userRole] ?? 'from-brand-600 to-brand-800';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl p-6 sm:p-8 text-white shadow-elevated animate-slide-up',
        `bg-gradient-to-br ${gradient}`,
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern bg-grid opacity-40" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-12 -left-8 h-48 w-48 rounded-full bg-black/10 blur-3xl" aria-hidden="true" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm ring-1 ring-white/20">
            <span>{getRoleIcon(role)}</span>
            {getRoleLabel(role)}
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome back, {name}
          </h1>
          {username && (
            <p className={cn('mt-1 text-sm', dark ? 'text-white/70' : 'text-white/80')}>
              @{username}
            </p>
          )}
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/85">
            {ROLE_DESCRIPTIONS[userRole]}
          </p>
        </div>
        <div className="shrink-0">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15 text-4xl backdrop-blur-md ring-1 ring-white/25 sm:h-24 sm:w-24 sm:text-5xl">
            {getRoleIcon(role)}
          </div>
        </div>
      </div>

      <div className="relative mt-5 rounded-xl bg-black/15 px-4 py-3 text-sm text-white/90 backdrop-blur-sm ring-1 ring-white/10">
        <span className="font-semibold text-white">🔒 Permissions · </span>
        {ROLE_PERMISSIONS[userRole]}
      </div>
    </div>
  );
}
