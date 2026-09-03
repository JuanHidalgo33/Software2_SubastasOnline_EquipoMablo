import { User } from '../../domain/entities/User';
import { Auction } from '../../domain/entities/Auction';
import { UserRepository } from '../../domain/ports/UserRepository';
import { AuctionRepository } from '../../domain/ports/AuctionRepository';
import { ApplicationError } from '../errors/ApplicationError';

export interface ProfileResult {
  user: User;
  publishedAuctions: Auction[];
  participatedAuctions: Auction[];
}

export class GetProfileUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auctionRepository: AuctionRepository,
  ) {}

  async execute(userId: string): Promise<ProfileResult> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ApplicationError('RESOURCE_NOT_FOUND', 'User not found.', 404);
    }

    const allAuctions = await this.auctionRepository.findAll();

    return {
      user,
      publishedAuctions: allAuctions.filter((auction) => auction.sellerId === userId),
      participatedAuctions: allAuctions.filter((auction) => auction.bids.some((bid) => bid.userId === userId)),
    };
  }
}