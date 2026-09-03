export interface RejectedBidAttempt {
  id: string;
  auctionId: string;
  userId: string;
  attemptedAmount: number;
  reasonCode: string;
  reasonMessage: string;
  date: Date;
}