import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';
import { ValidationError } from '../errors/AppError';

type RequestSource = 'params' | 'query' | 'body';

export function validateRequest(schema: ZodType, source: RequestSource) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const messages = result.error.issues.map((e) => e.message).join(', ');
      return next(new ValidationError(messages));
    }
    req[source] = result.data;
    next();
  };
}
