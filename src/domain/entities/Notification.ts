export interface Notification {
  id: string;
  recipientUserId: string;
  type: 'BID_OUTBID' | 'AUCTION_WON' | 'AUCTION_CLOSED' | 'PAYMENT_CONFIRMED';
  message: string;
  date: Date;
}