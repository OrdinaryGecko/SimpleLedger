import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const money = (n) =>
  n.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

export const shortDate = (d) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

export const dateTime = (iso) =>
  new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
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
