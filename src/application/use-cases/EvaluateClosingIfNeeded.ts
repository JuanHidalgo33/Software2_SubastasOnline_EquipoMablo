import { Auction } from '../../domain/entities/Auction';
import { AuctionRepository } from '../../domain/ports/AuctionRepository';
import { Clock } from '../../domain/ports/Clock';
import { IdGenerator } from '../../domain/ports/IdGenerator';

export async function evaluateClosingIfNeeded(
  auction: Auction,
  auctionRepository: AuctionRepository,
  clock: Clock,
  idGenerator: IdGenerator,
): Promise<void> {
  const statusBefore = auction.status;
  auction.evaluateClosing(clock.now(), () => idGenerator.generate());
  if (auction.status !== statusBefore) {
    await auctionRepository.save(auction);
  }
}