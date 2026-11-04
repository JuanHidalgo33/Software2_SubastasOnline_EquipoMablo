import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodTypeAny } from 'zod';
import { ApplicationError } from '../../../application/errors/ApplicationError';

function toValidationError(error: ZodError): ApplicationError {
  const details = error.issues.map((issue) => issue.message).join(' ');
  return new ApplicationError('VALIDATION_ERROR', details, 400);
}

// Valida el cuerpo y lo reemplaza por la versión limpia (por ejemplo, textos sin espacios sobrantes).
export function validateBody(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      next(toValidationError(result.error));
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(toValidationError(result.error));
      return;
    }
    next();
  };
}