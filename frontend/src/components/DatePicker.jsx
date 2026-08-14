import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { cn } from '../lib/utils';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const pad = (n) => String(n).padStart(2, '0');
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (v) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};
const label = (v) => {
  const d = parse(v);
  return d
    ? d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';
};

function monthGrid(cursor) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: offset }, () => null);
  for (let d = 1; d <= days; d += 1) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function DatePicker({ label: fieldLabel, value, onChange, disabled, className, size = 'md' }) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => parse(value) ?? new Date());
  const [placement, setPlacement] = useState('bottom');
  const [align, setAlign] = useState('left');
  const ref = useRef(null);
  const triggerRef = useRef(null);
  const calendarRef = useRef(null);

  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const calendar = calendarRef.current;
    if (!trigger || !calendar) return;

    const tRect = trigger.getBoundingClientRect();
    const cRect = calendar.getBoundingClientRect();
    const spaceBelow = window.innerHeight - tRect.bottom;
    const spaceAbove = tRect.top;

    if (spaceBelow < cRect.height && spaceAbove > cRect.height) {
      setPlacement('top');
    } else {
      setPlacement('bottom');
    }

    const spaceRight = window.innerWidth - tRect.left;
    if (spaceRight < cRect.width && tRect.right > cRect.width) {
      setAlign('right');
    } else {
      setAlign('left');
    }
  }, [open]);

  useEffect(() => {
    const d = parse(value);
    if (d) setCursor(d);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selected = parse(value);
  const todayISO = toISO(new Date());

  return (
    <div className={cn('relative', className)} ref={ref}>
      {fieldLabel ? (
        <span className="mb-2 block text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {fieldLabel}
        </span>
      ) : null}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex w-full items-center justify-between gap-3 border border-border bg-background px-3 font-mono text-foreground outline-none transition-colors hover:border-foreground focus:border-foreground disabled:pointer-events-none disabled:opacity-40',
          size === 'sm' ? 'h-9 text-xs' : 'h-10 text-sm',
          !value && 'text-muted-foreground/60'
        )}
      >
        <span>{value ? label(value) : 'Select date'}</span>
        <CalendarDays className="shrink-0 text-muted-foreground" size={size === 'sm' ? 14 : 16} strokeWidth={1.5} />
      </button>

      {open ? (
        <div
          ref={calendarRef}
          className={cn(
            'absolute z-50 w-[268px] border border-foreground bg-card p-3 shadow-[6px_6px_0_0_var(--color-border)]',
            placement === 'bottom' ? 'top-full mt-1' : 'bottom-full mb-1',
            align === 'left' ? 'left-0' : 'right-0'
          )}
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="border border-border px-2 py-1 text-xs text-muted-foreground hover:border-foreground hover:text-foreground"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            >
              ←
            </button>
            <span className="text-[10px] uppercase tracking-[0.2em]">
              {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
            </span>
            <button
              type="button"
              className="border border-border px-2 py-1 text-xs text-muted-foreground hover:border-foreground hover:text-foreground"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            >
              →
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-px text-center text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
            {DAYS.map((d, i) => (
              <span key={`${d}-${i}`} className="py-1">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px">
            {monthGrid(cursor).map((day, i) => {
              if (!day) return <span key={i} />;
              const iso = toISO(day);
              const isSelected = selected ? toISO(selected) === iso : false;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                  className={cn(
                    'h-8 border font-mono text-xs tabular-nums transition-colors',
                    isSelected
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-transparent text-foreground hover:border-foreground',
                    !isSelected && iso === todayISO && 'border-accent text-accent'
                  )}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <button
              type="button"
              className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
              onClick={() => {
                onChange(todayISO);
                setOpen(false);
              }}
            >
              Today
            </button>
            <button
              type="button"
              className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
