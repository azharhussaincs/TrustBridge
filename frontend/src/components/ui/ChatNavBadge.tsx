import { cn } from '@/lib/utils';

interface ChatNavBadgeProps {
  count: number;
  className?: string;
}

/** Unread message count pill for nav buttons */
export function ChatNavBadge({ count, className }: ChatNavBadgeProps) {
  if (!count || count <= 0) return null;

  return (
    <span
      className={cn(
        'ml-1.5 unread-badge',
        className
      )}
      aria-label={`${count} unread messages`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
