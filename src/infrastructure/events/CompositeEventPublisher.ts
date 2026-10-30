import { AuctionEvent, AuctionEventPublisher } from '../../application/ports/AuctionEventPublisher';

export class CompositeEventPublisher implements AuctionEventPublisher {
  constructor(private readonly publishers: AuctionEventPublisher[]) {}

  async publish(event: AuctionEvent): Promise<void> {
    for (const publisher of this.publishers) {
      await publisher.publish(event);
    }
  }
}