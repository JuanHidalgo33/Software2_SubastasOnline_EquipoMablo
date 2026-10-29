import { AuctionRepository } from '../../domain/ports/AuctionRepository';
import { IdGenerator } from '../../domain/ports/IdGenerator';
import { Clock } from '../../domain/ports/Clock';
import { Bid } from '../../domain/entities/Bid';
import { AuctionEventPublisher } from '../ports/AuctionEventPublisher';
import { ApplicationError } from '../errors/ApplicationError';
import { evaluateClosingIfNeeded } from './EvaluateClosingIfNeeded';

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
    private readonly eventPublisher: AuctionEventPublisher,
  ) {}

  async execute(input: PlaceBidInput): Promise<Bid> {
    const auction = await this.auctionRepository.findById(input.auctionId);
    if (!auction) {
      throw new ApplicationError('RESOURCE_NOT_FOUND', 'Auction not found.', 404);
    }
    await evaluateClosingIfNeeded(auction, {
      auctionRepository: this.auctionRepository,
      clock: this.clock,
      idGenerator: this.idGenerator,
      eventPublisher: this.eventPublisher,
    });

    const previousBid = auction.currentBid();

    let bid: Bid;
    try {
      bid = auction.placeBid(
        { userId: input.userId, amount: input.amount, date: this.clock.now() },
        () => this.idGenerator.generate(),
      );
    } finally {
      await this.auctionRepository.save(auction);
    }

    await this.eventPublisher.publish({
      type: 'BID_PLACED',
      auctionId: auction.id,
      bidId: bid.id,
      bidderId: bid.userId,
      amount: bid.amount.value,
      occurredAt: bid.date,
    });

    if (previousBid) {
      await this.eventPublisher.publish({
        type: 'BIDDER_OUTBID',
        auctionId: auction.id,
        outbidUserId: previousBid.userId,
        previousAmount: previousBid.amount.value,
        newAmount: bid.amount.value,
        occurredAt: bid.date,
      });
    }

    return bid;
  }
}