import { DomainError } from '../errors/DomainError';

export class Money {
  private constructor(private readonly amountInCOP: number) {}

  static of(amount: number): Money {
    if (typeof amount !== 'number' || !Number.isFinite(amount)) {
      throw new DomainError('INVALID_AMOUNT', 'The amount must be a valid number (RN-21).');
    }
    if (!Number.isInteger(amount)) {
      throw new DomainError('INVALID_AMOUNT', 'The amount cannot have decimals (RN-21).');
    }
    if (amount < 0) {
      throw new DomainError('INVALID_AMOUNT', 'The amount cannot be negative (RN-21).');
    }
    return new Money(amount);
  }

  get value(): number {
    return this.amountInCOP;
  }

  isGreaterThan(other: Money): boolean {
    return this.amountInCOP > other.amountInCOP;
  }

  isLessThan(other: Money): boolean {
    return this.amountInCOP < other.amountInCOP;
  }

  isGreaterThanOrEqualTo(other: Money): boolean {
    return this.amountInCOP >= other.amountInCOP;
  }

  add(other: Money): Money {
    return Money.of(this.amountInCOP + other.amountInCOP);
  }
}