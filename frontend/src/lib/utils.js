import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const money = (n, currency = '$') => {
  if (typeof n === 'string') return n;
  const formatted = Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return n < 0 ? `-${currency}${formatted}` : `${currency}${formatted}`;
};

export const shortDate = (d) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

export const dateTime = (iso) =>
  new Date(iso).toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York',
  });

export const STATUS_LABEL = {
  pending: 'Pending',
  partially_paid: 'Partially paid',
  paid: 'Paid',
  overdue: 'Overdue',
};

export const lineAmount = (item) =>
  Math.round((item.quantity * item.unit_price + Number.EPSILON) * 100) / 100;

export const subtotal = (items) =>
  Math.round((items.reduce((s, i) => s + lineAmount(i), 0) + Number.EPSILON) * 100) / 100;
