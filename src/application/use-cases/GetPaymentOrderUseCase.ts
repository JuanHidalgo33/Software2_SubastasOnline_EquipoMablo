import { PaymentOrder } from '../../domain/entities/PaymentOrder';
import { AuctionRepository } from '../../domain/ports/AuctionRepository';
import { Clock } from '../../domain/ports/Clock';
import { IdGenerator } from '../../domain/ports/IdGenerator';
import { ApplicationError } from '../errors/ApplicationError';
import { AuctionEventPublisher } from '../ports/AuctionEventPublisher';
import { evaluateClosingIfNeeded } from './EvaluateClosingIfNeeded';

export interface GetPaymentOrderInput {
  auctionId: string;
  requesterId: string;
}

export class GetPaymentOrderUseCase {
  constructor(
    private readonly auctionRepository: AuctionRepository,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher: AuctionEventPublisher,
  ) {}

  async execute(input: GetPaymentOrderInput): Promise<PaymentOrder> {
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

    const order = auction.paymentOrder;
    if (!order) {
      throw new ApplicationError('RESOURCE_NOT_FOUND', 'This auction has no payment order.', 404);
    }

    // RF-17
    if (order.winnerId !== input.requesterId) {
      throw new ApplicationError('FORBIDDEN', 'Only the winner can view this payment order.', 403);
    }

    return order;
  }
}