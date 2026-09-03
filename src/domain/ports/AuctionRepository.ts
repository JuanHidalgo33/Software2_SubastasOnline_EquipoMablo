import { Auction } from '../entities/Auction';

export interface AuctionRepository {
  save(auction: Auction): Promise<void>;
  findById(id: string): Promise<Auction | undefined>;
  findAll(): Promise<Auction[]>;
}