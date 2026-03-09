/**
 * Global Error Handler Middleware
 * 
 * Centralized error handling for consistent API responses.
 * Uses standardized error classes from utils/errors.ts
 */

import { Request, Response, NextFunction } from 'express';
import { 
  AppError, 
  errorResponse, 
  InternalError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  ConflictError
} from '../utils/errors';

// Re-export error classes for convenience
export { 
  AppError, 
  BadRequestError, 
  UnauthorizedError, 
  ForbiddenError, 
  NotFoundError, 
  ValidationError, 
  ConflictError,
  InternalError
};

/**
 * Global error handling middleware
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log error for debugging
  if (!(err instanceof AppError) || !(err as AppError).isOperational) {
    console.error('🚨 Unexpected Error:', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      userId: (req as any).auth?.userId
    });
  } else {
    console.log('⚠️ Operational Error:', {
      statusCode: (err as AppError).statusCode,
      message: err.message,
      path: req.path
    });
  }

  // Handle AppError instances
  if (err instanceof AppError) {
    res.status(err.statusCode).json(errorResponse(err));
    return;
  }

  // Handle Supabase/PostgreSQL specific errors
  const dbError = err as any;
  if (dbError.code && typeof dbError.code === 'string') {
    let statusCode = 500;
    let code = 'DATABASE_ERROR';
    let message = dbError.message || 'Database error';

    switch (dbError.code) {
      case '23505':
        statusCode = 409;
        code = 'DUPLICATE_ENTRY';
        message = 'A record with this value already exists';
        break;
      case '23503':
        statusCode = 400;
        code = 'FOREIGN_KEY_VIOLATION';
        message = 'Referenced record does not exist';
        break;
      case '23502':
        statusCode = 400;
        code = 'NULL_VIOLATION';
        message = 'Required field is missing';
        break;
      case 'PGRST116':
        statusCode = 404;
        code = 'NOT_FOUND';
        message = 'Record not found';
        break;
      case '42501':
        statusCode = 403;
        code = 'PERMISSION_DENIED';
        message = 'Database permission denied';
        break;
    }

    res.status(statusCode).json({
      success: false,
      error: { code, message }
    });
    return;
  }

  // Handle JWT/Auth errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired authentication token'
      }
    });
    return;
  }

  // Default: Internal server error
  const statusCode = (err as any).statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    },
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`
    }
  });
};

/**
 * Create custom error - DEPRECATED: Use error classes instead
 * @deprecated Use new BadRequestError(), new NotFoundError(), etc.
 */
export const createError = (message: string, statusCode: number = 500): AppError => {
  return new AppError(statusCode, message);
};
