import { DomainError } from '../errors/DomainError';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Email {
  private constructor(private readonly address: string) {}

  static of(rawValue: string): Email {
    const normalized = (rawValue ?? '').trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalized)) {
      throw new DomainError('INVALID_EMAIL', `"${rawValue}" is not a valid email address.`);
    }
    return new Email(normalized);
  }

  get value(): string {
    return this.address;
  }
}