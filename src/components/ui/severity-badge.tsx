import React from 'react';
import { cn, getSeverityColor } from '@/lib/utils';

interface SeverityBadgeProps {
  severity: string;
  className?: string;
  showDot?: boolean;
}

export function SeverityBadge({ severity, className, showDot = true }: SeverityBadgeProps) {
  const colors = getSeverityColor(severity);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold uppercase tracking-wider border',
        colors.bg,
        colors.text,
        colors.border,
        className
      )}
    >
      {showDot && <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', colors.dot)} />}
      {severity}
    </span>
  );
}
