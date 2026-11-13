import { NextFunction, Request, Response } from 'express';
import { AuctionEvent, AuctionEventPublisher } from '../../src/application/ports/AuctionEventPublisher';
import { HandlePaymentNotificationUseCase } from '../../src/application/use-cases/HandlePaymentNotificationUseCase';
import { Auction } from '../../src/domain/entities/Auction';
import { Clock } from '../../src/domain/ports/Clock';
import { Email } from '../../src/domain/value-objects/Email';
import { Money } from '../../src/domain/value-objects/Money';
import { signPayload, verifyWebhookSignature } from '../../src/infrastructure/http/middlewares/verifyWebhookSignature';
import { InMemoryAuctionRepository } from '../../src/infrastructure/persistence/InMemoryAuctionRepository';
import { openDatabase } from '../../src/infrastructure/persistence/sqlite/database';
import { SqliteAuctionRepository } from '../../src/infrastructure/persistence/sqlite/SqliteAuctionRepository';
import { SqliteUserRepository } from '../../src/infrastructure/persistence/sqlite/SqliteUserRepository';

class RecordingEventPublisher implements AuctionEventPublisher {
  readonly events: AuctionEvent[] = [];
  async publish(event: AuctionEvent): Promise<void> {
    this.events.push(event);
  }
}

class FixedClock implements Clock {
  constructor(public current: Date) {}
  now(): Date {
    return this.current;
  }
}

let idCounter = 0;
const idGenerator = { generate: () => `id-${++idCounter}` };

function awardedAuction(): Auction {
  const auction = Auction.publish({
    id: 'auction-1',
    sellerId: 'seller-1',
    categoryId: 'cat-electronics',
    item: { name: 'Bicycle', description: 'Barely used', condition: 'Good' },
    basePrice: Money.of(100000),
    minIncrement: Money.of(10000),
    publishedAt: new Date('2026-01-01T00:00:00.000Z'),
    closesAt: new Date('2026-01-01T12:00:00.000Z'),
  });
  auction.placeBid({ userId: 'winner-1', amount: 100000, date: new Date('2026-01-01T01:00:00.000Z') }, () => 'bid-1');
  auction.evaluateClosing(new Date('2026-01-01T12:00:00.000Z'), () => 'order-1');
  return auction;
}

async function setup() {
  idCounter = 0;
  const repository = new InMemoryAuctionRepository();
  const publisher = new RecordingEventPublisher();
  const clock = new FixedClock(new Date('2026-01-01T13:00:00.000Z'));
  await repository.save(awardedAuction());
  const useCase = new HandlePaymentNotificationUseCase(repository, idGenerator, clock, publisher);
  return { repository, publisher, clock, useCase };
}

const successful = { eventId: 'evt-1', paymentOrderId: 'order-1', result: 'SUCCESSFUL' as const };

describe('HandlePaymentNotificationUseCase', () => {
  it('confirms a pending payment order and notifies the winner (RF-20)', async () => {
    const { repository, publisher, useCase } = await setup();

    const result = await useCase.execute(successful);

    expect(result).toEqual({ outcome: 'CONFIRMED', paymentOrderStatus: 'CONFIRMED' });
    const stored = await repository.findById('auction-1');
    expect(stored?.paymentOrder?.status).toBe('CONFIRMED');
    expect(publisher.events.map((event) => event.type)).toEqual(['PAYMENT_CONFIRMED']);
  });

  it('processes a repeated notification only once (RN-19)', async () => {
    const { repository, publisher, useCase } = await setup();

    await useCase.execute(successful);
    const repeated = await useCase.execute(successful);

    expect(repeated.outcome).toBe('DUPLICATE');
    expect((await repository.findById('auction-1'))?.payments).toHaveLength(1);
    expect(publisher.events).toHaveLength(1);
  });

  it('records a failed payment without confirming the order', async () => {
    const { useCase } = await setup();

    const result = await useCase.execute({ ...successful, result: 'FAILED' });

    expect(result).toEqual({ outcome: 'RECORDED', paymentOrderStatus: 'PENDING' });
  });

  it('does not confirm a payment that arrives after the deadline (RN-20)', async () => {
    const { clock, useCase } = await setup();
    clock.current = new Date('2026-01-03T12:00:00.000Z');

    const result = await useCase.execute(successful);

    expect(result).toEqual({ outcome: 'RECORDED', paymentOrderStatus: 'EXPIRED' });
  });

  it('rejects an unknown payment order with 404', async () => {
    const { useCase } = await setup();

    await expect(useCase.execute({ ...successful, paymentOrderId: 'missing' })).rejects.toMatchObject({
      code: 'RESOURCE_NOT_FOUND',
      status: 404,
    });
  });
});

describe('verifyWebhookSignature (RN-18)', () => {
  const secret = 'test-secret';
  const body = Buffer.from(JSON.stringify(successful));

  function run(signature: string | undefined) {
    const req = { rawBody: body, header: () => signature } as unknown as Request;
    const next = jest.fn() as NextFunction;
    verifyWebhookSignature(secret)(req, {} as Response, next);
    return (next as jest.Mock).mock.calls[0][0];
  }

  it('accepts a notification signed with the shared secret', () => {
    expect(run(signPayload(secret, body))).toBeUndefined();
  });

  it('rejects a notification signed with another secret', () => {
    expect(run(signPayload('other-secret', body))).toMatchObject({ code: 'INVALID_SIGNATURE', status: 401 });
  });

  it('rejects a notification without signature', () => {
    expect(run(undefined)).toMatchObject({ code: 'INVALID_SIGNATURE', status: 401 });
  });
});

describe('SqliteAuctionRepository with payments', () => {
  it('keeps the confirmed payment after a reload', async () => {
    const db = openDatabase(':memory:');
    await new SqliteUserRepository(db).save({
      id: 'seller-1',
      name: 'Seller',
      email: Email.of('seller@example.com'),
      passwordHash: 'hash',
      registeredAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const repository = new SqliteAuctionRepository(db);
    const auction = awardedAuction();
    auction.registerPayment({
      id: 'payment-1',
      paymentOrderId: 'order-1',
      externalEventId: 'evt-1',
      result: 'SUCCESSFUL',
      receivedAt: new Date('2026-01-01T13:00:00.000Z'),
    });
    await repository.save(auction);

    const rebuilt = await repository.findByPaymentOrderId('order-1');

    expect(rebuilt?.paymentOrder?.status).toBe('CONFIRMED');
    expect(rebuilt?.payments.map((payment) => payment.externalEventId)).toEqual(['evt-1']);
    db.close();
  });
});
