import { GetPaymentOrderUseCase } from '../../src/application/use-cases/GetPaymentOrderUseCase';
import { AuctionEvent, AuctionEventPublisher } from '../../src/application/ports/AuctionEventPublisher';
import { InMemoryAuctionRepository } from '../../src/infrastructure/persistence/InMemoryAuctionRepository';
import { Auction } from '../../src/domain/entities/Auction';
import { Money } from '../../src/domain/value-objects/Money';
import { Clock } from '../../src/domain/ports/Clock';

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

async function setup() {
  idCounter = 0;
  const repository = new InMemoryAuctionRepository();
  const publisher = new RecordingEventPublisher();
  const clock = new FixedClock(new Date('2026-01-01T12:00:00.000Z'));

  const auction = Auction.publish({
    id: 'auction-1',
    sellerId: 'seller-1',
    categoryId: 'cat-1',
    item: { name: 'Bicycle', description: 'Barely used', condition: 'Good' },
    basePrice: Money.of(100000),
    minIncrement: Money.of(10000),
    publishedAt: new Date('2026-01-01T00:00:00.000Z'),
    closesAt: new Date('2026-01-02T00:00:00.000Z'),
  });
  auction.placeBid({ userId: 'winner-1', amount: 100000, date: new Date('2026-01-01T01:00:00.000Z') }, idGenerator.generate);
  await repository.save(auction);

  const useCase = new GetPaymentOrderUseCase(repository, clock, idGenerator, publisher);
  return { useCase, publisher, clock };
}

describe('GetPaymentOrderUseCase', () => {
  it('closes the auction lazily and returns the order to the winner (RF-17)', async () => {
    const { useCase, publisher, clock } = await setup();
    clock.current = new Date('2026-01-02T00:00:01.000Z');

    const order = await useCase.execute({ auctionId: 'auction-1', requesterId: 'winner-1' });

    expect(order.amount.value).toBe(100000);
    expect(order.status).toBe('PENDING');
    expect(publisher.events.map((event) => event.type)).toEqual(['AUCTION_CLOSED']);
  });

  it('forbids anyone other than the winner', async () => {
    const { useCase, clock } = await setup();
    clock.current = new Date('2026-01-02T00:00:01.000Z');

    await expect(useCase.execute({ auctionId: 'auction-1', requesterId: 'seller-1' })).rejects.toMatchObject({ status: 403 });
  });

  it('returns 404 while the auction is still open', async () => {
    const { useCase } = await setup();

    await expect(useCase.execute({ auctionId: 'auction-1', requesterId: 'winner-1' })).rejects.toMatchObject({ status: 404 });
  });

  it('shows the order as expired after 48 hours without payment (RN-20)', async () => {
    const { useCase, clock } = await setup();
    clock.current = new Date('2026-01-02T00:00:01.000Z');
    const pending = await useCase.execute({ auctionId: 'auction-1', requesterId: 'winner-1' });
    expect(pending.status).toBe('PENDING');

    clock.current = new Date('2026-01-04T00:00:01.000Z');
    const expired = await useCase.execute({ auctionId: 'auction-1', requesterId: 'winner-1' });

    expect(expired.status).toBe('EXPIRED');
  });
});