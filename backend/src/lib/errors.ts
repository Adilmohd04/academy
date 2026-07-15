export enum ErrorCode {
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  DATABASE_ERROR = 'DATABASE_ERROR',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  RATE_LIMIT = 'RATE_LIMIT',
}

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code: ErrorCode;
  public details?: any;
  public timestamp: string;

  constructor(message: string, code: ErrorCode = ErrorCode.INTERNAL_ERROR, statusCode = 500, details?: any) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    this.timestamp = new Date().toISOString();
    Object.setPrototypeOf(this, AppError.prototype);
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: this.timestamp,
      },
    };
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: any) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, details);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource', id?: string) {
    const msg = id ? `${resource} with ID '${id}' not found` : `${resource} not found`;
    const details = id ? { resource, id } : { resource };
    super(msg, ErrorCode.NOT_FOUND, 404, details);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, ErrorCode.UNAUTHORIZED, 401);
    this.name = 'UnauthorizedError';
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, ErrorCode.FORBIDDEN, 403);
    this.name = 'ForbiddenError';
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, ErrorCode.CONFLICT, 409);
    this.name = 'ConflictError';
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'Database error') {
    super(message, ErrorCode.DATABASE_ERROR, 500);
    this.name = 'DatabaseError';
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

export class PaymentError extends AppError {
  constructor(message = 'Payment failed') {
    super(message, ErrorCode.PAYMENT_FAILED, 402);
    this.name = 'PaymentError';
    Object.setPrototypeOf(this, PaymentError.prototype);
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter = 60) {
    super('Too many requests', ErrorCode.RATE_LIMIT, 429, { retryAfter });
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function asyncHandler(fn: Function) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
