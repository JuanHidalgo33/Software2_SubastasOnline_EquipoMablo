import { User } from '../../domain/entities/User';
import { Auction } from '../../domain/entities/Auction';
import { UserRepository } from '../../domain/ports/UserRepository';
import { AuctionRepository } from '../../domain/ports/AuctionRepository';
import { Clock } from '../../domain/ports/Clock';
import { IdGenerator } from '../../domain/ports/IdGenerator';
import { ApplicationError } from '../errors/ApplicationError';
import { AuctionEventPublisher } from '../ports/AuctionEventPublisher';
import { evaluateClosingIfNeeded } from './EvaluateClosingIfNeeded';

export interface ProfileResult {
  user: User;
  publishedAuctions: Auction[];
  participatedAuctions: Auction[];
}

export class GetProfileUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auctionRepository: AuctionRepository,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher: AuctionEventPublisher,
  ) {}

  async execute(userId: string): Promise<ProfileResult> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ApplicationError('RESOURCE_NOT_FOUND', 'User not found.', 404);
    }

    const allAuctions = await this.auctionRepository.findAll();

    const publishedAuctions = allAuctions.filter((auction) => auction.sellerId === userId);
    const participatedAuctions = allAuctions.filter((auction) => auction.bids.some((bid) => bid.userId === userId));

    for (const auction of new Set([...publishedAuctions, ...participatedAuctions])) {
      await evaluateClosingIfNeeded(auction, {
        auctionRepository: this.auctionRepository,
        clock: this.clock,
        idGenerator: this.idGenerator,
        eventPublisher: this.eventPublisher,
      });
    }

    return { user, publishedAuctions, participatedAuctions };
  }
}