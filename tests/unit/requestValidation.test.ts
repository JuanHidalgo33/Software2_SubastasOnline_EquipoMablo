import { Request, Response } from 'express';
import { validateBody, validateQuery } from '../../src/infrastructure/http/middlewares/validate';
import {
  registerUserSchema,
  publishAuctionSchema,
  placeBidSchema,
  listAuctionsQuerySchema,
} from '../../src/infrastructure/http/validation/schemas';

function runBody(schema: Parameters<typeof validateBody>[0], body: unknown) {
  const req = { body } as Request;
  const next = jest.fn();
  validateBody(schema)(req, {} as Response, next);
  return { req, error: next.mock.calls[0][0] };
}

function runQuery(query: Record<string, string>) {
  const req = { query } as unknown as Request;
  const next = jest.fn();
  validateQuery(listAuctionsQuerySchema)(req, {} as Response, next);
  return next.mock.calls[0][0];
}

const validAuction = {
  categoryId: 'cat-electronics',
  item: { name: 'Bicycle', description: 'Barely used', condition: 'Good' },
  basePrice: 100000,
  minIncrement: 10000,
  closesAt: '2026-12-01T18:00:00.000Z',
};

describe('request validation (RNF-03)', () => {
  it('accepts a valid registration and trims the texts', () => {
    const { req, error } = runBody(registerUserSchema, { name: '  Ana  ', email: 'ana@example.com', password: 'secret123' });
    expect(error).toBeUndefined();
    expect(req.body.name).toBe('Ana');
  });

  it('rejects a registration without name with VALIDATION_ERROR', () => {
    const { error } = runBody(registerUserSchema, { email: 'ana@example.com', password: 'secret123' });
    expect(error).toMatchObject({ code: 'VALIDATION_ERROR', status: 400 });
    expect(error.message).toContain('name is required.');
  });

  it('rejects an auction whose closing date is not an ISO date', () => {
    const { error } = runBody(publishAuctionSchema, { ...validAuction, closesAt: 'tomorrow' });
    expect(error).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(error.message).toContain('closesAt');
  });

  it('leaves business rules to the domain: a zero base price passes the format check', () => {
    const { error } = runBody(publishAuctionSchema, { ...validAuction, basePrice: 0 });
    expect(error).toBeUndefined();
  });

  it('rejects a bid whose amount is not a number', () => {
    const { error } = runBody(placeBidSchema, { amount: '110000' });
    expect(error).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(error.message).toContain('amount must be a number.');
  });

  it('rejects an unknown status filter and a page below 1', () => {
    expect(runQuery({ status: 'SOLD' })).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(runQuery({ page: '0' })).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(runQuery({ status: 'OPEN', page: '2' })).toBeUndefined();
  });
});