import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: string;
  trend?: string;
  accent?: 'blue' | 'emerald' | 'amber' | 'violet' | 'slate';
  className?: string;
}

const iconRingMap = {
  blue: 'ring-blue-300/40',
  emerald: 'ring-emerald-300/40',
  amber: 'ring-amber-300/40',
  violet: 'ring-violet-300/40',
  slate: 'ring-white/20',
};

export function StatCard({ label, value, icon, trend, accent = 'blue', className }: StatCardProps) {
  return (
    <div className={cn('stat-card', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="stat-card-label">{label}</p>
          <p className="stat-card-value">{value}</p>
          {trend && <p className="mt-1 text-xs text-card-muted">{trend}</p>}
        </div>
        {icon && (
          <span
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-xl ring-1 backdrop-blur-sm',
              iconRingMap[accent]
            )}
          >
            {icon}
          </span>
        )}
      </div>
    </div>
  );
}
