import { cn } from '@/lib/utils';

interface SecurityStripProps {
  className?: string;
  variant?: 'light' | 'dark';
}

const badges = [
  { icon: '🔐', label: 'AES-GCM Encrypted' },
  { icon: '🛡️', label: 'Zero Trust' },
  { icon: '🌐', label: 'LAN Only' },
  { icon: '👥', label: 'Role-Based Access' },
];

export function SecurityStrip({ className, variant = 'light' }: SecurityStripProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-center gap-2 sm:gap-3',
        className
      )}
    >
      {badges.map((badge) => (
        <span
          key={badge.label}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium',
            variant === 'dark'
              ? 'bg-white/10 text-white/80 ring-1 ring-white/15'
              : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
          )}
        >
          <span>{badge.icon}</span>
          {badge.label}
        </span>
      ))}
    </div>
  );
}
