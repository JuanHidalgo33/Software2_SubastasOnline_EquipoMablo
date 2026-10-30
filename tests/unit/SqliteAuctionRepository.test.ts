import { openDatabase, SqliteDatabase } from '../../src/infrastructure/persistence/sqlite/database';
import { SqliteAuctionRepository } from '../../src/infrastructure/persistence/sqlite/SqliteAuctionRepository';
import { SqliteUserRepository } from '../../src/infrastructure/persistence/sqlite/SqliteUserRepository';
import { Auction } from '../../src/domain/entities/Auction';
import { Money } from '../../src/domain/value-objects/Money';
import { Email } from '../../src/domain/value-objects/Email';

let db: SqliteDatabase;
let repository: SqliteAuctionRepository;
let idCounter = 0;
const nextId = () => `id-${++idCounter}`;

const at = (iso: string) => new Date(`2026-01-01T${iso}:00.000Z`);

function publishAuction() {
  return Auction.publish({
    id: 'auction-1',
    sellerId: 'seller-1',
    categoryId: 'cat-electronics',
    item: { name: 'Bicycle', description: 'Barely used', condition: 'Good' },
    basePrice: Money.of(100000),
    minIncrement: Money.of(10000),
    publishedAt: at('00:00'),
    closesAt: at('12:00'),
  });
}

beforeEach(async () => {
  idCounter = 0;
  db = openDatabase(':memory:');
  repository = new SqliteAuctionRepository(db);
  await new SqliteUserRepository(db).save({
    id: 'seller-1',
    name: 'Seller',
    email: Email.of('seller@example.com'),
    passwordHash: 'hash',
    registeredAt: at('00:00'),
  });
});

afterEach(() => db.close());

describe('SqliteAuctionRepository', () => {
  it('rebuilds an open auction with its bids in order', async () => {
    const auction = publishAuction();
    auction.placeBid({ userId: 'bidder-a', amount: 100000, date: at('01:00') }, nextId);
    auction.placeBid({ userId: 'bidder-b', amount: 120000, date: at('02:00') }, nextId);
    await repository.save(auction);

    const loaded = await repository.findById('auction-1');

    expect(loaded?.status).toBe('OPEN');
    expect(loaded?.bids.map((bid) => bid.userId)).toEqual(['bidder-a', 'bidder-b']);
    expect(loaded?.currentBid()?.amount.value).toBe(120000);
  });

  it('keeps enforcing the business rules after rebuilding', async () => {
    const auction = publishAuction();
    auction.placeBid({ userId: 'bidder-a', amount: 100000, date: at('01:00') }, nextId);
    await repository.save(auction);

    const loaded = await repository.findById('auction-1');

    expect(() => loaded?.placeBid({ userId: 'bidder-b', amount: 105000, date: at('02:00') }, nextId)).toThrow('RN-09');
  });

  it('rebuilds an awarded auction with the same payment order', async () => {
    const auction = publishAuction();
    auction.placeBid({ userId: 'bidder-a', amount: 100000, date: at('01:00') }, nextId);
    auction.evaluateClosing(at('13:00'), nextId);
    await repository.save(auction);

    const loaded = await repository.findById('auction-1');

    expect(loaded?.status).toBe('AWARDED');
    expect(loaded?.winnerId).toBe('bidder-a');
    expect(loaded?.paymentOrder?.id).toBe(auction.paymentOrder?.id);
    expect(loaded?.paymentOrder?.paymentDueAt).toEqual(auction.paymentOrder?.paymentDueAt);
  });

  it('rebuilds cancelled and unsold auctions', async () => {
    const cancelled = publishAuction();
    cancelled.cancel(at('01:00'), nextId);
    await repository.save(cancelled);
    expect((await repository.findById('auction-1'))?.status).toBe('CANCELLED');

    db.exec("DELETE FROM auctions");
    const unsold = publishAuction();
    unsold.evaluateClosing(at('13:00'), nextId);
    await repository.save(unsold);
    expect((await repository.findById('auction-1'))?.status).toBe('UNSOLD');
  });

  it('keeps every rejected bid attempt for auditing (RN-12)', async () => {
    const auction = publishAuction();
    expect(() => auction.placeBid({ userId: 'bidder-a', amount: 50000, date: at('01:00') }, nextId)).toThrow();
    await repository.save(auction);

    const loaded = await repository.findById('auction-1');
    expect(() => loaded?.placeBid({ userId: 'seller-1', amount: 100000, date: at('02:00') }, nextId)).toThrow();
    await repository.save(loaded!);

    const stored = db.prepare('SELECT reason_code FROM rejected_bid_attempts ORDER BY date').all();
    expect(stored).toEqual([{ reason_code: 'BID_BELOW_BASE_PRICE' }, { reason_code: 'SELLER_CANNOT_BID' }]);
  });
});