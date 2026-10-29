import { AuctionRepository } from '../../domain/ports/AuctionRepository';
import { IdGenerator } from '../../domain/ports/IdGenerator';
import { Clock } from '../../domain/ports/Clock';
import { ApplicationError } from '../errors/ApplicationError';
import { AuctionEventPublisher } from '../ports/AuctionEventPublisher';
import { evaluateClosingIfNeeded } from './EvaluateClosingIfNeeded';

export interface CancelAuctionInput {
  auctionId: string;
  requesterId: string;
}

export class CancelAuctionUseCase {
  constructor(
    private readonly auctionRepository: AuctionRepository,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
    private readonly eventPublisher: AuctionEventPublisher,
  ) {}

  async execute(input: CancelAuctionInput): Promise<void> {
    const auction = await this.auctionRepository.findById(input.auctionId);
    if (!auction) {
      throw new ApplicationError('RESOURCE_NOT_FOUND', 'Auction not found.', 404);
    }

    if (auction.sellerId !== input.requesterId) {
      throw new ApplicationError('FORBIDDEN', 'Only the seller can cancel this auction.', 403);
    }

    await evaluateClosingIfNeeded(auction, {
      auctionRepository: this.auctionRepository,
      clock: this.clock,
      idGenerator: this.idGenerator,
      eventPublisher: this.eventPublisher,
    });

    auction.cancel(this.clock.now(), () => this.idGenerator.generate());
    await this.auctionRepository.save(auction);
  }
}