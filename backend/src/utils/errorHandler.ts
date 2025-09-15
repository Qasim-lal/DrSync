/**
 * Error Handler Utilities
 * 
 * Provides standardized error handling for controllers and services
 */

import { Response } from 'express';
import { logger } from './logger';

/**
 * Standard error response interface
 */
interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  code: string;
  details?: any;
}

/**
 * Handle controller errors in a standardized way
 * @param error The error that occurred
 * @param res Express response object
 * @param defaultMessage Default error message if none provided
 * @param operation Operation name for logging
 */
export const handleControllerError = (
  error: any,
  res: Response,
  defaultMessage: string = 'Operation failed',
  operation: string = 'unknown'
): void => {
  logger.error(`Controller error in ${operation}:`, {
    error: error.message || error,
    stack: error.stack,
    operation
  });

  // Default error response
  let errorResponse: ErrorResponse = {
    success: false,
    error: 'Internal server error',
    message: defaultMessage,
    code: 'INTERNAL_ERROR'
  };

  // Handle specific error types
  if (error.name === 'ValidationError') {
    errorResponse = {
      success: false,
      error: 'Validation failed',
      message: error.message || 'Invalid input provided',
      code: 'VALIDATION_ERROR',
      details: error.details
    };
    res.status(400).json(errorResponse);
  } else if (error.name === 'NotFoundError' || error.message?.includes('not found')) {
    errorResponse = {
      success: false,
      error: 'Resource not found',
      message: error.message || 'Requested resource not found',
      code: 'NOT_FOUND'
    };
    res.status(404).json(errorResponse);
  } else if (error.name === 'UnauthorizedError' || error.message?.includes('unauthorized')) {
    errorResponse = {
      success: false,
      error: 'Unauthorized',
      message: error.message || 'Access denied',
      code: 'UNAUTHORIZED'
    };
    res.status(401).json(errorResponse);
  } else if (error.name === 'ForbiddenError' || error.message?.includes('forbidden')) {
    errorResponse = {
      success: false,
      error: 'Forbidden',
      message: error.message || 'Insufficient permissions',
      code: 'FORBIDDEN'
    };
    res.status(403).json(errorResponse);
  } else if (error.code === 'P2002') {
    // Prisma unique constraint violation
    errorResponse = {
      success: false,
      error: 'Duplicate entry',
      message: 'A record with this information already exists',
      code: 'DUPLICATE_ENTRY'
    };
    res.status(409).json(errorResponse);
  } else if (error.code === 'P2025') {
    // Prisma record not found
    errorResponse = {
      success: false,
      error: 'Resource not found',
      message: 'Requested resource not found',
      code: 'NOT_FOUND'
    };
    res.status(404).json(errorResponse);
  } else {
    // Generic server error
    res.status(500).json(errorResponse);
  }
};

/**
 * Create a standardized error object
 */
export const createError = (
  name: string,
  message: string,
  code?: string,
  details?: any
): Error => {
  const error = new Error(message);
  error.name = name;
  (error as any).code = code;
  (error as any).details = details;
  return error;
};

/**
 * Validation error helper
 */
export const createValidationError = (message: string, details?: any): Error => {
  return createError('ValidationError', message, 'VALIDATION_ERROR', details);
};

/**
 * Not found error helper
 */
export const createNotFoundError = (message: string = 'Resource not found'): Error => {
  return createError('NotFoundError', message, 'NOT_FOUND');
};

/**
 * Unauthorized error helper
 */
export const createUnauthorizedError = (message: string = 'Access denied'): Error => {
  return createError('UnauthorizedError', message, 'UNAUTHORIZED');
};

/**
 * Forbidden error helper
 */
export const createForbiddenError = (message: string = 'Insufficient permissions'): Error => {
  return createError('ForbiddenError', message, 'FORBIDDEN');
};