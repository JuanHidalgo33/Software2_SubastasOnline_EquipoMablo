import { Auction } from '../../domain/entities/Auction';
import { Bid } from '../../domain/entities/Bid';
import { PaymentOrder } from '../../domain/entities/PaymentOrder';
import { User } from '../../domain/entities/User';
import { Category } from '../../domain/entities/Category';

export function toBidResponse(bid: Bid) {
  return {
    id: bid.id,
    auctionId: bid.auctionId,
    userId: bid.userId,
    amount: bid.amount.value,
    date: bid.date,
  };
}

export function toPaymentOrderResponse(order: PaymentOrder) {
  return {
    id: order.id,
    auctionId: order.auctionId,
    winnerId: order.winnerId,
    amount: order.amount.value,
    generatedAt: order.generatedAt,
    paymentDueAt: order.paymentDueAt,
    status: order.status,
  };
}

export function toAuctionResponse(auction: Auction) {
  const currentBid = auction.currentBid();
  return {
    id: auction.id,
    sellerId: auction.sellerId,
    categoryId: auction.categoryId,
    item: auction.item,
    basePrice: auction.basePrice.value,
    minIncrement: auction.minIncrement.value,
    publishedAt: auction.publishedAt,
    closesAt: auction.closesAt,
    status: auction.status,
    totalBids: auction.bids.length,
    currentBid: currentBid ? toBidResponse(currentBid) : null,
    bidHistory: auction.bids.map(toBidResponse),
    winnerId: auction.winnerId ?? null,
    paymentOrder: auction.paymentOrder ? toPaymentOrderResponse(auction.paymentOrder) : null,
  };
}

export function toUserResponse(user: User) {
  // OJO: nunca incluir passwordHash aquí.
  return {
    id: user.id,
    name: user.name,
    email: user.email.value,
    registeredAt: user.registeredAt,
  };
}

export function toCategoryResponse(category: Category) {
  return category;
}