import { Auction } from '../../domain/entities/Auction';
import { AuctionRepository } from '../../domain/ports/AuctionRepository';
import { Clock } from '../../domain/ports/Clock';
import { IdGenerator } from '../../domain/ports/IdGenerator';
import { AuctionClosedEvent, AuctionEventPublisher } from '../ports/AuctionEventPublisher';

export interface ClosingDependencies {
  auctionRepository: AuctionRepository;
  clock: Clock;
  idGenerator: IdGenerator;
  eventPublisher: AuctionEventPublisher;
}

export async function evaluateClosingIfNeeded(auction: Auction, deps: ClosingDependencies): Promise<void> {
  const statusBefore = auction.status;
  const now = deps.clock.now();

  auction.evaluateClosing(now, () => deps.idGenerator.generate());
  let closedEvent: AuctionClosedEvent | undefined;
  if (statusBefore === 'OPEN' && (auction.status === 'AWARDED' || auction.status === 'UNSOLD')) {
    const winningBid = auction.currentBid();
    closedEvent = {
      type: 'AUCTION_CLOSED',
      auctionId: auction.id,
      sellerId: auction.sellerId,
      result: auction.status,
      winnerId: auction.winnerId ?? null,
      winningAmount: winningBid ? winningBid.amount.value : null,
      paymentOrderId: auction.paymentOrder ? auction.paymentOrder.id : null,
      occurredAt: now,
    };
  }

  auction.evaluatePaymentDeadline(now);

  if (auction.status === statusBefore) {
    return;
  }

  await deps.auctionRepository.save(auction);

  if (closedEvent) {
    await deps.eventPublisher.publish(closedEvent);
  }
}