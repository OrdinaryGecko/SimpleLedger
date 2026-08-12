import { cn } from '../lib/utils';

export function Button({ className, variant = 'solid', ...props }) {
  return (
    <button
      className={cn(
        'inline-flex h-10 items-center justify-center gap-2 border px-4 text-xs font-medium uppercase tracking-[0.14em] transition-colors disabled:pointer-events-none disabled:opacity-40',
        variant === 'solid' &&
          'border-foreground bg-foreground text-primary-foreground hover:bg-accent hover:border-accent',
        variant === 'outline' &&
          'border-border bg-background text-foreground hover:border-foreground',
        variant === 'ghost' && 'border-transparent text-muted-foreground hover:text-foreground',
        className
      )}
      {...props}
    />
  );
}

export function Field({ label, className, ...props }) {
  return (
    <label className="block">
      {label ? (
        <span className="mb-2 block text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
      ) : null}
      <input
        className={cn(
          'h-10 w-full border border-border bg-background px-3 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground',
          className
        )}
        {...props}
      />
    </label>
  );
}

export function Panel({ title, action, children, className }) {
  return (
    <section className={cn('border border-border bg-card', className)}>
      {title ? (
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{title}</h2>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function Stat({ label, value, sub }) {
  return (
    <div className="border border-border bg-card px-5 py-6">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="mt-3 font-mono text-2xl tabular-nums text-foreground">{value}</div>
      {sub ? <div className="mt-1 text-xs text-muted-foreground">{sub}</div> : null}
    </div>
  );
}

const statusStyles = {
  paid: 'border-foreground text-foreground',
  partially_paid: 'border-accent text-accent',
  pending: 'border-border text-muted-foreground',
  overdue: 'border-destructive text-destructive',
};

const statusLabels = {
  pending: 'Pending',
  partially_paid: 'Partially paid',
  paid: 'Paid',
  overdue: 'Overdue',
};

export function StatusTag({ status }) {
  return (
    <span
      className={cn(
        'inline-block border px-2 py-1 text-[10px] uppercase tracking-[0.16em]',
        statusStyles[status]
      )}
    >
      {statusLabels[status]}
    </span>
  );
}

export function Notice({ kind = 'error', children }) {
  return (
    <p
      className={cn(
        'border px-3 py-2 text-xs',
        kind === 'error'
          ? 'border-destructive text-destructive'
          : 'border-border text-muted-foreground'
      )}
    >
      {children}
    </p>
  );
}
