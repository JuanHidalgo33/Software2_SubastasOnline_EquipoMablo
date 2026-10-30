import { AuctionEvent, AuctionEventPublisher } from '../../application/ports/AuctionEventPublisher';
import { Notification } from '../../domain/entities/Notification';
import { IdGenerator } from '../../domain/ports/IdGenerator';
import { AuctionRealtimeHub } from '../realtime/AuctionRealtimeHub';

export class WebSocketEventPublisher implements AuctionEventPublisher {
  constructor(
    private readonly hub: AuctionRealtimeHub,
    private readonly idGenerator: IdGenerator,
  ) {}

  async publish(event: AuctionEvent): Promise<void> {
    switch (event.type) {
      case 'BID_PLACED':
        // RF-13: nueva puja vigente para todos los suscritos.
        this.hub.broadcastToAuction(event.auctionId, {
          type: 'bid.placed',
          auctionId: event.auctionId,
          bidId: event.bidId,
          bidderId: event.bidderId,
          currentAmount: event.amount,
          occurredAt: event.occurredAt,
        });
        break;

      case 'BIDDER_OUTBID':
        // RF-14: aviso solo para el postor superado.
        this.notify({
          recipientUserId: event.outbidUserId,
          type: 'BID_OUTBID',
          message: `Your bid of ${event.previousAmount} was outbid by ${event.newAmount}.`,
          date: event.occurredAt,
        }, event.auctionId);
        break;

      case 'AUCTION_CLOSED':
        // RF-15: cierre y resultado para todos los suscritos.
        this.hub.broadcastToAuction(event.auctionId, {
          type: 'auction.closed',
          auctionId: event.auctionId,
          result: event.result,
          winnerId: event.winnerId,
          winningAmount: event.winningAmount,
          occurredAt: event.occurredAt,
        });
        // Seccion 4.4: se notifica al ganador y al vendedor.
        if (event.winnerId) {
          this.notify({
            recipientUserId: event.winnerId,
            type: 'AUCTION_WON',
            message: `You won the auction with a bid of ${event.winningAmount}.`,
            date: event.occurredAt,
          }, event.auctionId);
        }
        this.notify({
          recipientUserId: event.sellerId,
          type: 'AUCTION_CLOSED',
          message: event.result === 'AWARDED'
            ? `Your auction was awarded for ${event.winningAmount}.`
            : 'Your auction closed without bids.',
          date: event.occurredAt,
        }, event.auctionId);
        break;
    }
  }

  private notify(data: Omit<Notification, 'id'>, auctionId: string): void {
    const notification: Notification = { id: this.idGenerator.generate(), ...data };
    this.hub.sendToUser(notification.recipientUserId, { type: 'notification', auctionId, notification });
  }
}