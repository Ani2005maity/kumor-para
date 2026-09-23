import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiResponse } from '@kumorpara/shared';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public details?: any;

  constructor(message: string, statusCode: number = 400, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: any,
  _req: Request,
  res: Response<ApiResponse>,
  _next: NextFunction
): void {
  // 1. Zod Validation Error
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));

    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: formattedErrors,
    });
    return;
  }

  // 2. Mongoose Duplicate Key Error (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    res.status(409).json({
      success: false,
      error: `A record with this ${field} already exists.`,
    });
    return;
  }

  // 3. Mongoose CastError (Invalid ObjectId)
  if (err.name === 'CastError') {
    res.status(400).json({
      success: false,
      error: `Invalid format for field: ${err.path}`,
    });
    return;
  }

  // 4. Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors || {}).map((e: any) => e.message);
    res.status(400).json({
      success: false,
      error: messages.join(', ') || 'Validation error',
    });
    return;
  }

  // 5. Custom AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      details: err.details,
    });
    return;
  }

  // 6. JWT Errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired authentication token',
    });
    return;
  }

  // 7. General / Unhandled Error (Never leak stack trace or internal Mongo errors)
  console.error('[Unhandled Error]', err);

  const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;
  const message =
    statusCode === 500 && process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred. Please try again later.'
      : err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: message,
  });
}
