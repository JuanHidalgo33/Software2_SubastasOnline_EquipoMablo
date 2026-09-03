import { Auction } from '../../src/domain/entities/Auction';
import { Money } from '../../src/domain/value-objects/Money';

function publishTestAuction(overrides: Partial<{
  basePrice: number;
  minIncrement: number;
  publishedAt: Date;
  closesAt: Date;
  sellerId: string;
}> = {}) {
  return Auction.publish({
    id: 'auction-1',
    sellerId: overrides.sellerId ?? 'seller-1',
    categoryId: 'cat-1',
    item: { name: 'Bicycle', description: 'Barely used', condition: 'Good' },
    basePrice: Money.of(overrides.basePrice ?? 100000),
    minIncrement: Money.of(overrides.minIncrement ?? 10000),
    publishedAt: overrides.publishedAt ?? new Date('2026-01-01T00:00:00.000Z'),
    closesAt: overrides.closesAt ?? new Date('2026-01-02T00:00:00.000Z'),
  });
}

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `id-${idCounter}`;
}

beforeEach(() => {
  idCounter = 0;
});

describe('Auction.publish', () => {
  it('creates an OPEN auction when all data is valid', () => {
    expect(publishTestAuction().status).toBe('OPEN');
  });

  it('rejects a base price of zero (RN-01)', () => {
    expect(() => publishTestAuction({ basePrice: 0 })).toThrow('RN-01');
  });

  it('rejects a minimum increment of zero (RN-01)', () => {
    expect(() => publishTestAuction({ minIncrement: 0 })).toThrow('RN-01');
  });

  it('rejects a closing date before the publication date (RN-02)', () => {
    expect(() =>
      publishTestAuction({
        publishedAt: new Date('2026-01-02T00:00:00.000Z'),
        closesAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    ).toThrow('RN-02');
  });

  it('rejects a duration shorter than one hour (RN-03)', () => {
    expect(() =>
      publishTestAuction({ closesAt: new Date('2026-01-01T00:30:00.000Z') }),
    ).toThrow('RN-03');
  });

  it('rejects a duration longer than thirty days (RN-03)', () => {
    expect(() =>
      publishTestAuction({ closesAt: new Date('2026-03-01T00:00:00.000Z') }),
    ).toThrow('RN-03');
  });
});

describe('Auction.placeBid', () => {
  it('accepts a first bid equal to the base price (RN-08)', () => {
    const auction = publishTestAuction();
    auction.placeBid({ userId: 'buyer-1', amount: 100000, date: new Date('2026-01-01T01:00:00.000Z') }, nextId);
    expect(auction.bids).toHaveLength(1);
    expect(auction.currentBid()?.userId).toBe('buyer-1');
  });

  it('rejects a first bid below the base price (RN-08)', () => {
    const auction = publishTestAuction();
    expect(() =>
      auction.placeBid({ userId: 'buyer-1', amount: 50000, date: new Date('2026-01-01T01:00:00.000Z') }, nextId),
    ).toThrow('RN-08');
    expect(auction.rejectedBidAttempts).toHaveLength(1);
  });

  it('rejects a bid that does not beat the current one by the minimum increment (RN-09)', () => {
    const auction = publishTestAuction();
    auction.placeBid({ userId: 'buyer-1', amount: 100000, date: new Date('2026-01-01T01:00:00.000Z') }, nextId);
    expect(() =>
      auction.placeBid({ userId: 'buyer-2', amount: 105000, date: new Date('2026-01-01T02:00:00.000Z') }, nextId),
    ).toThrow('RN-09');
  });

  it('rejects the seller bidding on their own auction (RN-07)', () => {
    const auction = publishTestAuction({ sellerId: 'seller-1' });
    expect(() =>
      auction.placeBid({ userId: 'seller-1', amount: 100000, date: new Date('2026-01-01T01:00:00.000Z') }, nextId),
    ).toThrow('RN-07');
  });

  it('rejects the current highest bidder trying to outbid themselves (RN-10)', () => {
    const auction = publishTestAuction();
    auction.placeBid({ userId: 'buyer-1', amount: 100000, date: new Date('2026-01-01T01:00:00.000Z') }, nextId);
    expect(() =>
      auction.placeBid({ userId: 'buyer-1', amount: 150000, date: new Date('2026-01-01T02:00:00.000Z') }, nextId),
    ).toThrow('RN-10');
  });

  it('accepts a valid higher bid and replaces the current one', () => {
    const auction = publishTestAuction();
    auction.placeBid({ userId: 'buyer-1', amount: 100000, date: new Date('2026-01-01T01:00:00.000Z') }, nextId);
    auction.placeBid({ userId: 'buyer-2', amount: 110000, date: new Date('2026-01-01T02:00:00.000Z') }, nextId);
    expect(auction.currentBid()?.userId).toBe('buyer-2');
    expect(auction.currentBid()?.amount.value).toBe(110000);
  });

  it('rejects bids once the closing date has passed (RN-06)', () => {
    const auction = publishTestAuction();
    expect(() =>
      auction.placeBid({ userId: 'buyer-1', amount: 100000, date: new Date('2026-01-02T00:00:01.000Z') }, nextId),
    ).toThrow('RN-06');
    expect(auction.status).toBe('UNSOLD');
  });
});

describe('Auction.cancel', () => {
  it('cancels an open auction that has no bids (RN-04)', () => {
    const auction = publishTestAuction();
    auction.cancel(new Date('2026-01-01T05:00:00.000Z'), nextId);
    expect(auction.status).toBe('CANCELLED');
  });

  it('refuses to cancel an auction that already has a bid (RN-04)', () => {
    const auction = publishTestAuction();
    auction.placeBid({ userId: 'buyer-1', amount: 100000, date: new Date('2026-01-01T01:00:00.000Z') }, nextId);
    expect(() => auction.cancel(new Date('2026-01-01T05:00:00.000Z'), nextId)).toThrow('RN-04');
  });
});

describe('Auction.evaluateClosing', () => {
  it('awards the auction to the highest bidder and generates a payment order (RN-13, RN-15)', () => {
    const auction = publishTestAuction();
    auction.placeBid({ userId: 'buyer-1', amount: 100000, date: new Date('2026-01-01T01:00:00.000Z') }, nextId);

    auction.evaluateClosing(new Date('2026-01-02T00:00:01.000Z'), nextId);

    expect(auction.status).toBe('AWARDED');
    expect(auction.winnerId).toBe('buyer-1');
    expect(auction.paymentOrder).toBeDefined();
    expect(auction.paymentOrder?.amount.value).toBe(100000);
  });

  it('marks the auction as UNSOLD when it closes without any bids (RN-14)', () => {
    const auction = publishTestAuction();
    auction.evaluateClosing(new Date('2026-01-02T00:00:01.000Z'), nextId);
    expect(auction.status).toBe('UNSOLD');
  });

  it('does nothing if the closing date has not arrived yet', () => {
    const auction = publishTestAuction();
    auction.evaluateClosing(new Date('2026-01-01T12:00:00.000Z'), nextId);
    expect(auction.status).toBe('OPEN');
  });

  it('is idempotent: evaluating closing twice does not change the outcome (RN-16)', () => {
    const auction = publishTestAuction();
    auction.placeBid({ userId: 'buyer-1', amount: 100000, date: new Date('2026-01-01T01:00:00.000Z') }, nextId);
    auction.evaluateClosing(new Date('2026-01-02T00:00:01.000Z'), nextId);
    const paymentOrderIdAfterFirstClose = auction.paymentOrder?.id;

    auction.evaluateClosing(new Date('2026-01-03T00:00:00.000Z'), nextId);

    expect(auction.status).toBe('AWARDED');
    expect(auction.paymentOrder?.id).toBe(paymentOrderIdAfterFirstClose);
  });
});