import { Request, Response, NextFunction } from 'express';
import { logEvent } from '../services/analytics';

export interface ApiError extends Error {
  statusCode: number;
  userMessage: string;
}

export class AppError extends Error implements ApiError {
  statusCode: number;
  userMessage: string;

  constructor(statusCode: number, message: string, userMessage: string = message) {
    super(message);
    this.statusCode = statusCode;
    this.userMessage = userMessage;
    this.name = 'AppError';
  }
}

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const e = err as Partial<ApiError>;
  const statusCode = e.statusCode || 500;
  const message = e.message || 'Internal server error';
  const userMessage = e.userMessage || 'Terjadi kesalahan. Coba lagi nanti.';

  console.error(`[Error ${statusCode}] ${message}`, err);

  // Log error to analytics (async, don't wait)
  if (_req.user?.uid) {
    logEvent(_req.user.uid, 'error_occurred', {
      statusCode,
      message,
      path: _req.path,
      method: _req.method,
    }).catch(e => console.error('Failed to log error:', e));
  }

  res.status(statusCode).json({
    error: userMessage,
    message: process.env.NODE_ENV === 'development' ? message : undefined,
  });
};

type AsyncRoute = (req: Request, res: Response, next: NextFunction) => unknown;

export const asyncHandler =
  (fn: AsyncRoute) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
