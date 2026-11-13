import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { ApplicationError } from '../../../application/errors/ApplicationError';

export const SIGNATURE_HEADER = 'X-Signature';

export function signPayload(secret: string, payload: Buffer | string): string {
  return `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;
}

export function verifyWebhookSignature(secret: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    const received = Buffer.from(req.header(SIGNATURE_HEADER) ?? '');
    const expected = Buffer.from(signPayload(secret, rawBody ?? ''));

    if (!rawBody || received.length !== expected.length || !timingSafeEqual(received, expected)) {
      next(new ApplicationError('INVALID_SIGNATURE', 'The notification signature is not valid.', 401));
      return;
    }
    next();
  };
}
