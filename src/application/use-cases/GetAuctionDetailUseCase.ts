import { Auction } from '../../domain/entities/Auction';
import { AuctionRepository } from '../../domain/ports/AuctionRepository';
import { Clock } from '../../domain/ports/Clock';
import { IdGenerator } from '../../domain/ports/IdGenerator';
import { ApplicationError } from '../errors/ApplicationError';
import { AuctionEventPublisher } from '../ports/AuctionEventPublisher';
import { evaluateClosingIfNeeded } from './EvaluateClosingIfNeeded';

export class GetAuctionDetailUseCase {
  constructor(
    private readonly auctionRepository: AuctionRepository,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher: AuctionEventPublisher,
  ) {}

  async execute(auctionId: string): Promise<Auction> {
    const auction = await this.auctionRepository.findById(auctionId);
    if (!auction) {
      throw new ApplicationError('RESOURCE_NOT_FOUND', 'Auction not found.', 404);
    }
    await evaluateClosingIfNeeded(auction, {
      auctionRepository: this.auctionRepository,
      clock: this.clock,
      idGenerator: this.idGenerator,
      eventPublisher: this.eventPublisher,
    });
    return auction;
  }
}