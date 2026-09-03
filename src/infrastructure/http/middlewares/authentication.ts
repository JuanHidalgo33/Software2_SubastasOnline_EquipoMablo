import { NextFunction, Request, Response } from 'express';
import { TokenService } from '../../../application/ports/TokenService';
import { ApplicationError } from '../../../application/errors/ApplicationError';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function authenticate(tokenService: TokenService) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    const header = req.header('Authorization');
    if (!header || !header.startsWith('Bearer ')) {
      throw new ApplicationError('UNAUTHENTICATED', 'A valid Authorization header is required.', 401);
    }

    const token = header.slice('Bearer '.length);
    const payload = tokenService.verify(token);
    if (!payload) {
      throw new ApplicationError('UNAUTHENTICATED', 'The token is invalid or has expired.', 401);
    }

    req.userId = payload.userId;
    next();
  };
}