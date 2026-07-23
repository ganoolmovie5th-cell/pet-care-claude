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

export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  const userMessage = err.userMessage || 'Terjadi kesalahan. Coba lagi nanti.';

  console.error(`[Error ${statusCode}] ${message}`, err);

  // Log error to analytics (async, don't wait)
  if ((_req as any).user?.uid) {
    logEvent((_req as any).user.uid, 'error_occurred', {
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

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
