import { Money } from '../value-objects/Money';

export interface Bid {
  id: string;
  auctionId: string;
  userId: string;
  amount: Money;
  date: Date;
}