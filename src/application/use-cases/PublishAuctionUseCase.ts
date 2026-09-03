import { Auction } from '../../domain/entities/Auction';
import { AuctionRepository } from '../../domain/ports/AuctionRepository';
import { CategoryRepository } from '../../domain/ports/CategoryRepository';
import { Clock } from '../../domain/ports/Clock';
import { IdGenerator } from '../../domain/ports/IdGenerator';
import { Money } from '../../domain/value-objects/Money';
import { Item } from '../../domain/entities/Item';
import { ApplicationError } from '../errors/ApplicationError';

export interface PublishAuctionCommand {
  sellerId: string;
  categoryId: string;
  item: Item;
  basePrice: number;
  minIncrement: number;
  closesAt: Date;
}

export class PublishAuctionUseCase {
  constructor(
    private readonly auctionRepository: AuctionRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(input: PublishAuctionCommand): Promise<Auction> {
    const category = await this.categoryRepository.findById(input.categoryId);
    if (!category) {
      throw new ApplicationError('RESOURCE_NOT_FOUND', 'Category not found.', 404);
    }

    const auction = Auction.publish({
      id: this.idGenerator.generate(),
      sellerId: input.sellerId,
      categoryId: input.categoryId,
      item: input.item,
      basePrice: Money.of(input.basePrice),
      minIncrement: Money.of(input.minIncrement),
      publishedAt: this.clock.now(),
      closesAt: input.closesAt,
    });

    await this.auctionRepository.save(auction);
    return auction;
  }
}