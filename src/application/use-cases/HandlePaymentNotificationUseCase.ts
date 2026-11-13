import { PaymentOutcome } from '../../domain/entities/Auction';
import { PaymentEvent } from '../../domain/entities/PaymentEvent';
import { AuctionRepository } from '../../domain/ports/AuctionRepository';
import { Clock } from '../../domain/ports/Clock';
import { IdGenerator } from '../../domain/ports/IdGenerator';
import { ApplicationError } from '../errors/ApplicationError';
import { AuctionEventPublisher } from '../ports/AuctionEventPublisher';
import { evaluateClosingIfNeeded } from './EvaluateClosingIfNeeded';

export interface PaymentNotificationInput {
  eventId: string;
  paymentOrderId: string;
  result: 'SUCCESSFUL' | 'FAILED';
}

export interface PaymentNotificationResult {
  outcome: PaymentOutcome;
  paymentOrderStatus: 'PENDING' | 'CONFIRMED' | 'EXPIRED';
}

export class HandlePaymentNotificationUseCase {
  constructor(
    private readonly auctionRepository: AuctionRepository,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
    private readonly eventPublisher: AuctionEventPublisher,
  ) {}

  async execute(input: PaymentNotificationInput): Promise<PaymentNotificationResult> {
    const auction = await this.auctionRepository.findByPaymentOrderId(input.paymentOrderId);
    if (!auction || !auction.paymentOrder) {
      throw new ApplicationError('RESOURCE_NOT_FOUND', 'Payment order not found.', 404);
    }

    await evaluateClosingIfNeeded(auction, {
      auctionRepository: this.auctionRepository,
      clock: this.clock,
      idGenerator: this.idGenerator,
      eventPublisher: this.eventPublisher,
    });

    const now = this.clock.now();
    const event: PaymentEvent = {
      id: this.idGenerator.generate(),
      paymentOrderId: input.paymentOrderId,
      externalEventId: input.eventId,
      result: input.result,
      receivedAt: now,
    };

    const outcome = auction.registerPayment(event);
    const order = auction.paymentOrder;

    if (outcome === 'DUPLICATE') {
      return { outcome, paymentOrderStatus: order.status };
    }

    await this.auctionRepository.save(auction);

    if (outcome === 'CONFIRMED') {
      await this.eventPublisher.publish({
        type: 'PAYMENT_CONFIRMED',
        auctionId: auction.id,
        paymentOrderId: order.id,
        winnerId: order.winnerId,
        amount: order.amount.value,
        occurredAt: now,
      });
    }

    return { outcome, paymentOrderStatus: order.status };
  }
}
