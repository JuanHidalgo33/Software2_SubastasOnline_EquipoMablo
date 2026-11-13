export interface BidPlacedEvent {
  type: 'BID_PLACED';
  auctionId: string;
  bidId: string;
  bidderId: string;
  amount: number;
  occurredAt: Date;
}

export interface BidderOutbidEvent {
  type: 'BIDDER_OUTBID';
  auctionId: string;
  outbidUserId: string;
  previousAmount: number;
  newAmount: number;
  occurredAt: Date;
}

export interface AuctionClosedEvent {
  type: 'AUCTION_CLOSED';
  auctionId: string;
  sellerId: string;
  result: 'AWARDED' | 'UNSOLD';
  winnerId: string | null;
  winningAmount: number | null;
  paymentOrderId: string | null;
  occurredAt: Date;
}

export interface PaymentConfirmedEvent {
  type: 'PAYMENT_CONFIRMED';
  auctionId: string;
  paymentOrderId: string;
  winnerId: string;
  amount: number;
  occurredAt: Date;
}

export type AuctionEvent = BidPlacedEvent | BidderOutbidEvent | AuctionClosedEvent | PaymentConfirmedEvent;

export interface AuctionEventPublisher {
  publish(event: AuctionEvent): Promise<void>;
}
