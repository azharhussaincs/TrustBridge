import Image from 'next/image';
import { cn } from '@/lib/utils';

interface OpBridgeLogoProps {
  size?: number;
  className?: string;
  priority?: boolean;
}

export function OpBridgeLogo({ size = 40, className, priority = false }: OpBridgeLogoProps) {
  return (
    <Image
      src="/opbridge-logo.png"
      alt="OPBridge logo"
      width={size}
      height={size}
      className={cn('object-contain', className)}
      priority={priority}
    />
  );
}
