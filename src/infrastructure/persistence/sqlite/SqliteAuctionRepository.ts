import { Auction } from '../../../domain/entities/Auction';
import { AuctionRepository } from '../../../domain/ports/AuctionRepository';
import { Money } from '../../../domain/value-objects/Money';
import { SqliteDatabase } from './database';

interface AuctionRow {
  id: string;
  seller_id: string;
  category_id: string;
  item_name: string;
  item_description: string;
  item_condition: string;
  base_price: number;
  min_increment: number;
  published_at: string;
  closes_at: string;
  status: string;
  winner_id: string | null;
}

interface BidRow {
  id: string;
  user_id: string;
  amount: number;
  date: string;
}

interface PaymentOrderRow {
  id: string;
  generated_at: string;
}

export class SqliteAuctionRepository implements AuctionRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async save(auction: Auction): Promise<void> {
    const saveAll = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO auctions (id, seller_id, category_id, item_name, item_description, item_condition,
                                 base_price, min_increment, published_at, closes_at, status, winner_id)
           VALUES (@id, @sellerId, @categoryId, @itemName, @itemDescription, @itemCondition,
                   @basePrice, @minIncrement, @publishedAt, @closesAt, @status, @winnerId)
           ON CONFLICT(id) DO UPDATE SET status = excluded.status, winner_id = excluded.winner_id`,
        )
        .run({
          id: auction.id,
          sellerId: auction.sellerId,
          categoryId: auction.categoryId,
          itemName: auction.item.name,
          itemDescription: auction.item.description,
          itemCondition: auction.item.condition,
          basePrice: auction.basePrice.value,
          minIncrement: auction.minIncrement.value,
          publishedAt: auction.publishedAt.toISOString(),
          closesAt: auction.closesAt.toISOString(),
          status: auction.status,
          winnerId: auction.winnerId ?? null,
        });

      const insertBid = this.db.prepare(
        'INSERT OR IGNORE INTO bids (id, auction_id, user_id, amount, date) VALUES (?, ?, ?, ?, ?)',
      );
      for (const bid of auction.bids) {
        insertBid.run(bid.id, auction.id, bid.userId, bid.amount.value, bid.date.toISOString());
      }

      const insertAttempt = this.db.prepare(
        `INSERT OR IGNORE INTO rejected_bid_attempts
           (id, auction_id, user_id, attempted_amount, reason_code, reason_message, date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      );
      for (const attempt of auction.rejectedBidAttempts) {
        const amount = Number.isFinite(attempt.attemptedAmount) ? attempt.attemptedAmount : null;
        insertAttempt.run(
          attempt.id, auction.id, attempt.userId, amount,
          attempt.reasonCode, attempt.reasonMessage, attempt.date.toISOString(),
        );
      }

      const order = auction.paymentOrder;
      if (order) {
        this.db
          .prepare(
            `INSERT INTO payment_orders (id, auction_id, winner_id, amount, generated_at, payment_due_at, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET status = excluded.status`,
          )
          .run(
            order.id, auction.id, order.winnerId, order.amount.value,
            order.generatedAt.toISOString(), order.paymentDueAt.toISOString(), order.status,
          );
      }
    });

    saveAll();
  }

  async findById(id: string): Promise<Auction | undefined> {
    const row = this.db.prepare('SELECT * FROM auctions WHERE id = ?').get(id) as AuctionRow | undefined;
    return row ? this.rebuild(row) : undefined;
  }

  async findAll(): Promise<Auction[]> {
    const rows = this.db.prepare('SELECT * FROM auctions ORDER BY published_at DESC').all() as AuctionRow[];
    return rows.map((row) => this.rebuild(row));
  }

  private rebuild(row: AuctionRow): Auction {
    const auction = Auction.publish({
      id: row.id,
      sellerId: row.seller_id,
      categoryId: row.category_id,
      item: { name: row.item_name, description: row.item_description, condition: row.item_condition },
      basePrice: Money.of(row.base_price),
      minIncrement: Money.of(row.min_increment),
      publishedAt: new Date(row.published_at),
      closesAt: new Date(row.closes_at),
    });

    const bids = this.db
      .prepare('SELECT id, user_id, amount, date FROM bids WHERE auction_id = ? ORDER BY amount ASC')
      .all(row.id) as BidRow[];
    for (const bid of bids) {
      auction.placeBid({ userId: bid.user_id, amount: bid.amount, date: new Date(bid.date) }, () => bid.id);
    }

    if (row.status === 'CANCELLED') {
      auction.cancel(auction.publishedAt, unexpectedId);
    } else if (row.status === 'AWARDED' || row.status === 'UNSOLD' || row.status === 'DEFAULTED') {
      const order = this.db
        .prepare('SELECT id, generated_at FROM payment_orders WHERE auction_id = ?')
        .get(row.id) as PaymentOrderRow | undefined;
      const closedAt = order ? new Date(order.generated_at) : auction.closesAt;
      auction.evaluateClosing(closedAt, () => (order ? order.id : unexpectedId()));
      
      // RN-20
      if (row.status === 'DEFAULTED' && auction.paymentOrder) {
        auction.evaluatePaymentDeadline(auction.paymentOrder.paymentDueAt);
      }
    }

    if (auction.status !== row.status) {
      throw new Error(`Stored auction ${row.id} is inconsistent: expected ${row.status}, rebuilt ${auction.status}.`);
    }
    return auction;
  }
}

function unexpectedId(): string {
  throw new Error('The rebuild requested an id that is not stored.');
}