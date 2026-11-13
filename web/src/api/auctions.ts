import { request } from './client';
import type { Auction, AuctionPage, AuctionStatus, Bid, Item, PaymentOrder } from './types';
export interface AuctionFilters {
  categoryId?: string;
  status?: AuctionStatus;
  page?: number;
  pageSize?: number;
}

export function listAuctions(filters: AuctionFilters = {}): Promise<AuctionPage> {
  const params = new URLSearchParams();
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.status) params.set('status', filters.status);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  const query = params.toString();
  return request<AuctionPage>(`/auctions${query ? `?${query}` : ''}`);
}

export interface PublishAuctionData {
  categoryId: string;
  item: Item;
  basePrice: number;
  minIncrement: number;
  closesAt: string;
}

export function publishAuction(data: PublishAuctionData): Promise<Auction> {
  return request<Auction>('/auctions', { method: 'POST', body: data });
}


export function getAuction(id: string): Promise<Auction> {
  return request<Auction>(`/auctions/${id}`);
}

export function placeBid(auctionId: string, amount: number): Promise<Bid> {
  return request<Bid>(`/auctions/${auctionId}/bids`, { method: 'POST', body: { amount } });
}

export function getPaymentOrder(auctionId: string): Promise<PaymentOrder> {
  return request<PaymentOrder>(`/auctions/${auctionId}/payment-order`);
}

export function cancelAuction(auctionId: string): Promise<void> {
  return request<void>(`/auctions/${auctionId}/cancel`, { method: 'POST' });
}