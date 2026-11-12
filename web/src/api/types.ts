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