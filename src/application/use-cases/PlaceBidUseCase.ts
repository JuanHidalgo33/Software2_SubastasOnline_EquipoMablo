import { AuctionRepository } from '../../domain/ports/AuctionRepository';
import { IdGenerator } from '../../domain/ports/IdGenerator';
import { Clock } from '../../domain/ports/Clock';
import { ApplicationError } from '../errors/ApplicationError';

export interface PlaceBidInput {
  auctionId: string;
  userId: string;
  amount: number;
}

export class PlaceBidUseCase {
  constructor(
    private readonly auctionRepository: AuctionRepository,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: PlaceBidInput) {
    const auction = await this.auctionRepository.findById(input.auctionId);
    if (!auction) {
      throw new ApplicationError('RESOURCE_NOT_FOUND', 'Auction not found.', 404);
    }

    try {
      return auction.placeBid(
        { userId: input.userId, amount: input.amount, date: this.clock.now() },
        () => this.idGenerator.generate(),
      );
    } finally {
      // Se guarda SIEMPRE, incluso si la puja fue rechazada: el intento
      // fallido también queda registrado dentro de la subasta (RN-12).
      await this.auctionRepository.save(auction);
    }
  }
}