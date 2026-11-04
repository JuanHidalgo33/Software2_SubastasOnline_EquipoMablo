import { NextFunction, Request, Response } from 'express';
import { DomainError } from '../../../domain/errors/DomainError';
import { ApplicationError } from '../../../application/errors/ApplicationError';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof DomainError) {
    res.status(400).json({ code: err.code, message: err.message });
    return;
  }
  if (err instanceof ApplicationError) {
    res.status(err.status).json({ code: err.code, message: err.message });
    return;
  }
  if (isMalformedJson(err)) {
    res.status(400).json({ code: 'INVALID_JSON', message: 'The request body is not valid JSON.' });
    return;
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' });
}

function isMalformedJson(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { type?: string }).type === 'entity.parse.failed';
}