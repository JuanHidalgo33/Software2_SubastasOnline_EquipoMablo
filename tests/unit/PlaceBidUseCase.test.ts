import { PlaceBidUseCase } from '../../src/application/use-cases/PlaceBidUseCase';
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

  await repository.save(
    Auction.publish({
      id: 'auction-1',
      sellerId: 'seller-1',
      categoryId: 'cat-1',
      item: { name: 'Bicycle', description: 'Barely used', condition: 'Good' },
      basePrice: Money.of(100000),
      minIncrement: Money.of(10000),
      publishedAt: new Date('2026-01-01T00:00:00.000Z'),
      closesAt: new Date('2026-01-02T00:00:00.000Z'),
    }),
  );

  const useCase = new PlaceBidUseCase(repository, idGenerator, clock, publisher);
  return { useCase, publisher, clock };
}

describe('PlaceBidUseCase events', () => {
  it('publishes BID_PLACED when the first bid is accepted', async () => {
    const { useCase, publisher } = await setup();

    await useCase.execute({ auctionId: 'auction-1', userId: 'bidder-a', amount: 100000 });

    expect(publisher.events.map((event) => event.type)).toEqual(['BID_PLACED']);
  });

  it('publishes BIDDER_OUTBID to the previous highest bidder', async () => {
    const { useCase, publisher } = await setup();
    await useCase.execute({ auctionId: 'auction-1', userId: 'bidder-a', amount: 100000 });

    await useCase.execute({ auctionId: 'auction-1', userId: 'bidder-b', amount: 110000 });

    const outbid = publisher.events.find((event) => event.type === 'BIDDER_OUTBID');
    expect(outbid).toMatchObject({ outbidUserId: 'bidder-a', previousAmount: 100000, newAmount: 110000 });
  });

  it('publishes nothing when the bid is rejected', async () => {
    const { useCase, publisher } = await setup();

    await expect(
      useCase.execute({ auctionId: 'auction-1', userId: 'bidder-a', amount: 50000 }),
    ).rejects.toThrow('RN-08');

    expect(publisher.events).toEqual([]);
  });

  it('publishes AUCTION_CLOSED when a bid arrives after the closing date', async () => {
    const { useCase, publisher, clock } = await setup();
    await useCase.execute({ auctionId: 'auction-1', userId: 'bidder-a', amount: 100000 });
    clock.current = new Date('2026-01-03T00:00:00.000Z');

    await expect(
      useCase.execute({ auctionId: 'auction-1', userId: 'bidder-b', amount: 110000 }),
    ).rejects.toThrow('RN-06');

    expect(publisher.events[publisher.events.length - 1]).toMatchObject({
      type: 'AUCTION_CLOSED',
      result: 'AWARDED',
      winnerId: 'bidder-a',
    });
  });
});