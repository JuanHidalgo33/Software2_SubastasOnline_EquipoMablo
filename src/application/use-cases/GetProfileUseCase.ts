import { User } from '../../domain/entities/User';
import { Auction } from '../../domain/entities/Auction';
import { UserRepository } from '../../domain/ports/UserRepository';
import { AuctionRepository } from '../../domain/ports/AuctionRepository';
import { Clock } from '../../domain/ports/Clock';
import { IdGenerator } from '../../domain/ports/IdGenerator';
import { ApplicationError } from '../errors/ApplicationError';
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
  ) {}

  async execute(userId: string): Promise<ProfileResult> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ApplicationError('RESOURCE_NOT_FOUND', 'User not found.', 404);
    }

    const allAuctions = await this.auctionRepository.findAll();

    const publishedAuctions = allAuctions.filter((auction) => auction.sellerId === userId);
    const participatedAuctions = allAuctions.filter((auction) => auction.bids.some((bid) => bid.userId === userId));

    // Cierre perezoso (seccion 4.4): consultar el perfil tambien consulta estas subastas.
    for (const auction of new Set([...publishedAuctions, ...participatedAuctions])) {
      await evaluateClosingIfNeeded(auction, this.auctionRepository, this.clock, this.idGenerator);
    }
    
    return { user, publishedAuctions, participatedAuctions };
  }
}