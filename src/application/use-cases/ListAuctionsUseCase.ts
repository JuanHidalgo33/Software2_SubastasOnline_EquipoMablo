import { Auction, AuctionStatus } from '../../domain/entities/Auction';
import { AuctionRepository } from '../../domain/ports/AuctionRepository';
import { Clock } from '../../domain/ports/Clock';
import { IdGenerator } from '../../domain/ports/IdGenerator';
import { evaluateClosingIfNeeded } from './EvaluateClosingIfNeeded';

export interface ListAuctionsInput {
  categoryId?: string;
  status?: AuctionStatus;
  page?: number;
  pageSize?: number;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export class ListAuctionsUseCase {
  constructor(
    private readonly auctionRepository: AuctionRepository,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(input: ListAuctionsInput): Promise<PagedResult<Auction>> {
    const allAuctions = await this.auctionRepository.findAll();

    for (const auction of allAuctions) {
      await evaluateClosingIfNeeded(auction, this.auctionRepository, this.clock, this.idGenerator);
    }

    const filtered = allAuctions.filter((auction) => {
      if (input.categoryId && auction.categoryId !== input.categoryId) return false;
      if (input.status && auction.status !== input.status) return false;
      return true;
    });

    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 10;
    const startIndex = (page - 1) * pageSize;

    return {
      items: filtered.slice(startIndex, startIndex + pageSize),
      page,
      pageSize,
      totalItems: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
    };
  }
}