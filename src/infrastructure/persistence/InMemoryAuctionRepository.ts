import { Auction } from '../../domain/entities/Auction';
import { AuctionRepository } from '../../domain/ports/AuctionRepository';

export class InMemoryAuctionRepository implements AuctionRepository {
  private readonly auctions = new Map<string, Auction>();

  async save(auction: Auction): Promise<void> {
    this.auctions.set(auction.id, auction);
  }

  async findById(id: string): Promise<Auction | undefined> {
    return this.auctions.get(id);
  }

  async findAll(): Promise<Auction[]> {
    return [...this.auctions.values()];
  }
}