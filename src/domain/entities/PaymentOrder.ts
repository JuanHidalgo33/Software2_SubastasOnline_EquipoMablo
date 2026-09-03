import { Money } from '../value-objects/Money';

export const PAYMENT_DEADLINE_HOURS = 48;

export interface PaymentOrder {
  id: string;
  auctionId: string;
  winnerId: string;
  amount: Money;
  generatedAt: Date;
  paymentDueAt: Date;
  status: 'PENDING' | 'CONFIRMED' | 'EXPIRED';
}