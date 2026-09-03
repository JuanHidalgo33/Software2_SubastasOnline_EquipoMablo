import { AuctionRepository } from '../../domain/ports/AuctionRepository';
import { IdGenerator } from '../../domain/ports/IdGenerator';
import { Clock } from '../../domain/ports/Clock';
import { ApplicationError } from '../errors/ApplicationError';

export interface CancelAuctionInput {
  auctionId: string;
  requesterId: string;
}

export class CancelAuctionUseCase {
  constructor(
    private readonly auctionRepository: AuctionRepository,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: CancelAuctionInput): Promise<void> {
    const auction = await this.auctionRepository.findById(input.auctionId);
    if (!auction) {
      throw new ApplicationError('RESOURCE_NOT_FOUND', 'Auction not found.', 404);
    }

    // RF-07: solo el vendedor que publicó la subasta puede cancelarla.
    if (auction.sellerId !== input.requesterId) {
      throw new ApplicationError('FORBIDDEN', 'Only the seller can cancel this auction.', 403);
    }

    auction.cancel(this.clock.now(), () => this.idGenerator.generate());
    await this.auctionRepository.save(auction);
  }
}