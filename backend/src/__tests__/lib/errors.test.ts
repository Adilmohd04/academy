/**
 * Error Classes Unit Tests
 */

import { describe, it, expect, jest } from '@jest/globals';
import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  DatabaseError,
  PaymentError,
  RateLimitError,
  ErrorCode,
  isAppError,
  asyncHandler,
} from '../../lib/errors';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create error with default values', () => {
      const error = new AppError('Test error');
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error.timestamp).toBeDefined();
    });

    it('should create error with custom values', () => {
      const error = new AppError(
        'Custom error',
        ErrorCode.VALIDATION_ERROR,
        400,
        { field: 'email' }
      );
      
      expect(error.message).toBe('Custom error');
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ field: 'email' });
    });

    it('should serialize to JSON correctly', () => {
      const error = new AppError('Test', ErrorCode.NOT_FOUND, 404);
      const json = error.toJSON();
      
      expect(json.success).toBe(false);
      expect(json.error.code).toBe(ErrorCode.NOT_FOUND);
      expect(json.error.message).toBe('Test');
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with 400 status', () => {
      const error = new ValidationError('Invalid input', { field: 'email' });
      
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.name).toBe('ValidationError');
    });
  });

  describe('NotFoundError', () => {
    it('should create not found error with resource name', () => {
      const error = new NotFoundError('Course', 'abc123');
      
      expect(error.message).toBe("Course with ID 'abc123' not found");
      expect(error.statusCode).toBe(404);
      expect(error.details).toEqual({ resource: 'Course', id: 'abc123' });
    });

    it('should create not found error without ID', () => {
      const error = new NotFoundError('User');
      
      expect(error.message).toBe('User not found');
    });
  });

  describe('UnauthorizedError', () => {
    it('should create unauthorized error with 401 status', () => {
      const error = new UnauthorizedError();
      
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Authentication required');
    });
  });

  describe('ForbiddenError', () => {
    it('should create forbidden error with 403 status', () => {
      const error = new ForbiddenError();
      
      expect(error.statusCode).toBe(403);
    });
  });

  describe('ConflictError', () => {
    it('should create conflict error with 409 status', () => {
      const error = new ConflictError('Already exists');
      
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe(ErrorCode.CONFLICT);
    });
  });

  describe('DatabaseError', () => {
    it('should create database error with 500 status', () => {
      const error = new DatabaseError('Query failed');
      
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe(ErrorCode.DATABASE_ERROR);
    });
  });

  describe('PaymentError', () => {
    it('should create payment error with 402 status', () => {
      const error = new PaymentError('Payment declined');
      
      expect(error.statusCode).toBe(402);
      expect(error.code).toBe(ErrorCode.PAYMENT_FAILED);
    });
  });

  describe('RateLimitError', () => {
    it('should create rate limit error with 429 status', () => {
      const error = new RateLimitError(120);
      
      expect(error.statusCode).toBe(429);
      expect(error.details).toEqual({ retryAfter: 120 });
    });
  });

  describe('isAppError', () => {
    it('should return true for AppError instances', () => {
      expect(isAppError(new AppError('test'))).toBe(true);
      expect(isAppError(new ValidationError('test'))).toBe(true);
      expect(isAppError(new NotFoundError('test'))).toBe(true);
    });

    it('should return false for regular errors', () => {
      expect(isAppError(new Error('test'))).toBe(false);
      expect(isAppError('string')).toBe(false);
      expect(isAppError(null)).toBe(false);
    });
  });

  describe('asyncHandler', () => {
    it('should catch async errors and pass to next', async () => {
      const mockNext = jest.fn();
      const error = new Error('Async error');
      const handler = asyncHandler(async () => {
        throw error;
      });

      await handler({} as any, {} as any, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should not call next on success', async () => {
      const mockNext = jest.fn();
      const mockRes = { json: jest.fn() };
      const handler = asyncHandler(async (req: any, res: any) => {
        res.json({ success: true });
      });

      await handler({} as any, mockRes as any, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({ success: true });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
