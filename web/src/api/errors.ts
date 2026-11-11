import { ApiError } from './client';

const MESSAGES: Record<string, string> = {
  NETWORK_ERROR: 'Cannot connect to the server. Check that the API is running.',
  VALIDATION_ERROR: 'Please check the form data.',
  INVALID_JSON: 'The request sent is not valid.',
  UNAUTHENTICATED: 'Your session has expired. Please log in again.',
  INVALID_CREDENTIALS: 'Incorrect email or password.',
  FORBIDDEN: 'You are not allowed to perform this action.',
  RESOURCE_NOT_FOUND: 'What you are looking for was not found.',
  TOO_MANY_REQUESTS: 'Too many requests. Wait a few minutes and try again.',
  INVALID_EMAIL: 'The email address is not valid.',
  EMAIL_ALREADY_REGISTERED: 'This email is already registered.',
  INVALID_BASE_PRICE: 'The base price must be greater than zero.',
  INVALID_MIN_INCREMENT: 'The minimum increment must be greater than zero.',
  INVALID_CLOSING_DATE: 'The closing date must be later than the current date.',
  INVALID_DURATION: 'The auction must last between 1 hour and 30 days.',
  AUCTION_NOT_CANCELLABLE: 'The auction can no longer be cancelled because it has bids or is closed.',
  AUCTION_CLOSED: 'The auction is already closed.',
  SELLER_CANNOT_BID: 'You cannot bid on an auction you published.',
  INVALID_AMOUNT: 'The amount must be a whole number in pesos, without decimals.',
  BID_BELOW_BASE_PRICE: 'The first bid must be equal to or greater than the base price.',
  ALREADY_HIGHEST_BIDDER: 'You already have the highest bid; you cannot outbid yourself.',
  INSUFFICIENT_BID: 'Your bid must beat the current one by at least the minimum increment.',
};

export function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    const friendly = MESSAGES[error.code];
    if (error.code === 'VALIDATION_ERROR') {
      return `${friendly} (${error.message})`;
    }
    return friendly ?? error.message;
  }
  return 'An unexpected error occurred.';
}