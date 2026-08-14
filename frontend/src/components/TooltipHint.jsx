import { useState } from 'react';
import { cn } from '../lib/utils';

export function TooltipHint({ label, children, className, side = 'top' }) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className={cn('relative block', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open ? (
        <span
          role="tooltip"
          className={cn(
            'pointer-events-none absolute left-1/2 z-50 w-max max-w-[240px] -translate-x-1/2 border border-foreground bg-card px-3 py-2 text-[10px] uppercase leading-relaxed tracking-[0.14em] text-foreground shadow-[4px_4px_0_0_var(--color-border)]',
            side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          )}
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}
