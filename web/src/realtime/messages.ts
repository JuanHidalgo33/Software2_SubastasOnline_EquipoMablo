export interface BidPlacedMessage {
  type: 'bid.placed';
  auctionId: string;
  bidId: string;
  bidderId: string;
  currentAmount: number;
  occurredAt: string;
}

export interface AuctionClosedMessage {
  type: 'auction.closed';
  auctionId: string;
  result: 'AWARDED' | 'UNSOLD';
  winnerId: string | null;
  winningAmount: number | null;
  occurredAt: string;
}

export interface PresenceMessage {
  type: 'auction.presence';
  auctionId: string;
  connected: number;
}

export interface NotificationMessage {
  type: 'notification';
  auctionId: string;
  notification: {
    id: string;
    type: 'BID_OUTBID' | 'AUCTION_WON' | 'AUCTION_CLOSED' | 'PAYMENT_CONFIRMED';
    message: string;
    date: string;
  };
}

export type ServerMessage =
  | BidPlacedMessage
  | AuctionClosedMessage
  | PresenceMessage
  | NotificationMessage
  | { type: 'connected' | 'subscribed' | 'unsubscribed' | 'error' };