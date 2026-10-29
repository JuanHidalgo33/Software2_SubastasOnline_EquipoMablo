import { AuctionEvent, AuctionEventPublisher } from '../../application/ports/AuctionEventPublisher';

export class ConsoleEventPublisher implements AuctionEventPublisher {
  async publish(event: AuctionEvent): Promise<void> {
    console.log(`[event] ${event.occurredAt.toISOString()} ${event.type}`, JSON.stringify(event));
  }
}