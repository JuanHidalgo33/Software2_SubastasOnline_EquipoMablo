export type AuctionStatus = 'OPEN' | 'CANCELLED' | 'AWARDED' | 'UNSOLD' | 'DEFAULTED';

export interface User {
  id: string;
  name: string;
  email: string;
  registeredAt: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Category {
  id: string;
  name: string;
}

export interface Item {
  name: string;
  description: string;
  condition: string;
}

export interface Bid {
  id: string;
  auctionId: string;
  userId: string;
  amount: number;
  date: string;
}

export interface Auction {
  id: string;
  sellerId: string;
  categoryId: string;
  item: Item;
  basePrice: number;
  minIncrement: number;
  publishedAt: string;
  closesAt: string;
  status: AuctionStatus;
  totalBids: number;
  currentBid: Bid | null;
  bidHistory: Bid[];
  winnerId: string | null;
}

export interface AuctionPage {
  items: Auction[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}