import type { AuctionStatus } from '../api/types';

const currency = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const dateTime = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatMoney(amount: number): string {
  return currency.format(amount);
}

export function formatDate(value: string): string {
  return dateTime.format(new Date(value));
}

export const STATUS_LABELS: Record<AuctionStatus, string> = {
  OPEN: 'Open',
  CANCELLED: 'Cancelled',
  AWARDED: 'Awarded',
  UNSOLD: 'Unsold',
  DEFAULTED: 'Defaulted',
};