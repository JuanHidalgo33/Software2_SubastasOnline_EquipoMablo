import { DomainError } from '../errors/DomainError';
import { Money } from '../value-objects/Money';
import { Item } from './Item';
import { RejectedBidAttempt } from './RejectedBidAttempt';
import { PaymentOrder, PAYMENT_DEADLINE_HOURS } from './PaymentOrder';
import { Bid } from './Bid';

export type AuctionStatus = 'OPEN' | 'CANCELLED' | 'AWARDED' | 'UNSOLD';

const ONE_HOUR_MS = 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * ONE_HOUR_MS;

export interface PublishAuctionInput {
  id: string;
  sellerId: string;
  categoryId: string;
  item: Item;
  basePrice: Money;
  minIncrement: Money;
  publishedAt: Date;
  closesAt: Date;
}

export class Auction {
  status: AuctionStatus = 'OPEN';
  winnerId?: string;
  paymentOrder?: PaymentOrder;

  private readonly bidHistory: Bid[] = [];
  private readonly rejectedAttempts: RejectedBidAttempt[] = [];

  private constructor(
    public readonly id: string,
    public readonly sellerId: string,
    public readonly categoryId: string,
    public readonly item: Item,
    public readonly basePrice: Money,
    public readonly minIncrement: Money,
    public readonly publishedAt: Date,
    public readonly closesAt: Date,
  ) {}

  static publish(input: PublishAuctionInput): Auction {

    if (input.basePrice.value <= 0) {
      throw new DomainError('INVALID_BASE_PRICE', 'The base price must be greater than zero (RN-01).');
    }
    if (input.minIncrement.value <= 0) {
      throw new DomainError('INVALID_MIN_INCREMENT', 'The minimum increment must be greater than zero (RN-01).');
    }

    if (input.closesAt.getTime() <= input.publishedAt.getTime()) {
      throw new DomainError('INVALID_CLOSING_DATE', 'The closing date must be after the publication date (RN-02).');
    }

    const durationMs = input.closesAt.getTime() - input.publishedAt.getTime();
    if (durationMs < ONE_HOUR_MS || durationMs > THIRTY_DAYS_MS) {
      throw new DomainError('INVALID_DURATION', 'An auction must last between one hour and thirty calendar days (RN-03).');
    }

    return new Auction(
      input.id,
      input.sellerId,
      input.categoryId,
      input.item,
      input.basePrice,
      input.minIncrement,
      input.publishedAt,
      input.closesAt,
    );
  }

  get bids(): ReadonlyArray<Bid> {
    return this.bidHistory;
  }

  get rejectedBidAttempts(): ReadonlyArray<RejectedBidAttempt> {
    return this.rejectedAttempts;
  }

  currentBid(): Bid | undefined {
    return this.bidHistory[this.bidHistory.length - 1];
  }

  evaluateClosing(now: Date, generateId: () => string): void {
    if (this.status !== 'OPEN') {
      return;
    }
    if (now.getTime() < this.closesAt.getTime()) {
      return;
    }

    const winningBid = this.currentBid();

    if (!winningBid) {
      this.status = 'UNSOLD'; 
      return;
    }

    this.status = 'AWARDED';
    this.winnerId = winningBid.userId;

    this.paymentOrder = {
      id: generateId(),
      auctionId: this.id,
      winnerId: winningBid.userId,
      amount: winningBid.amount,
      generatedAt: now,
      paymentDueAt: new Date(now.getTime() + PAYMENT_DEADLINE_HOURS * 60 * 60 * 1000),
      status: 'PENDING',
    };
  }

  cancel(now: Date, generateId: () => string): void {
    this.evaluateClosing(now, generateId);

    if (this.bidHistory.length > 0) {
      throw new DomainError('AUCTION_NOT_CANCELLABLE', 'An auction that already received a bid cannot be cancelled (RN-04).');
    }
    if (this.status !== 'OPEN') {
      throw new DomainError('AUCTION_NOT_CANCELLABLE', 'Only an open auction can be cancelled.');
    }
    this.status = 'CANCELLED';
  }

  placeBid(data: { userId: string; amount: number; date: Date }, generateId: () => string): Bid {

    this.evaluateClosing(data.date, generateId);

    if (this.status !== 'OPEN') {
      return this.reject(data, generateId, 'AUCTION_CLOSED', 'The auction is not open (RN-06).');
    }

    if (data.userId === this.sellerId) {
      return this.reject(data, generateId, 'SELLER_CANNOT_BID', "A user cannot bid on an item they published themselves (RN-07).");
    }

    let amount: Money;
    try {
      amount = Money.of(data.amount);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid amount.';
      return this.reject(data, generateId, 'INVALID_AMOUNT', message);
    }

    const winningBid = this.currentBid();

    if (!winningBid) {
      if (amount.isLessThan(this.basePrice)) {
        return this.reject(data, generateId, 'BID_BELOW_BASE_PRICE', 'The first bid must be greater than or equal to the base price (RN-08).');
      }
    } else if (winningBid.userId === data.userId) {
        return this.reject(data, generateId, 'ALREADY_HIGHEST_BIDDER', 'You cannot outbid yourself when you are already the highest bidder (RN-10).');
    } else if (!amount.isGreaterThanOrEqualTo(winningBid.amount.add(this.minIncrement))) {
        return this.reject(data, generateId, 'INSUFFICIENT_BID', 'The bid must beat the current one by at least the minimum increment (RN-09).');
    }

    const bid: Bid = {
      id: generateId(),
      auctionId: this.id,
      userId: data.userId,
      amount,
      date: data.date,
    };
    this.bidHistory.push(bid);
    return bid;
  }

  private reject(
    data: { userId: string; amount: number; date: Date },
    generateId: () => string,
    reasonCode: string,
    reasonMessage: string,
  ): never {
    this.rejectedAttempts.push({
      id: generateId(),
      auctionId: this.id,
      userId: data.userId,
      attemptedAmount: data.amount,
      reasonCode,
      reasonMessage,
      date: data.date,
    });
    throw new DomainError(reasonCode, reasonMessage);
  }
}