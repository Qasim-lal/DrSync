/**
 * Rate Limiter Middleware
 * 
 * Provides rate limiting functionality for API endpoints to prevent abuse
 * and ensure fair usage across different operations.
 */

import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger';

/**
 * Create a rate limiter with specified limits
 * @param maxRequests Maximum number of requests allowed
 * @param windowMs Time window in milliseconds
 * @param message Optional custom error message
 */
export const rateLimiter = (maxRequests: number, windowMs: number, message?: string) => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    message: {
      success: false,
      error: 'Rate limit exceeded',
      message: message || `Too many requests. Maximum ${maxRequests} requests per ${Math.floor(windowMs / 1000)} seconds.`,
      code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        limit: maxRequests,
        window: windowMs
      });
      
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: message || `Too many requests. Maximum ${maxRequests} requests per ${Math.floor(windowMs / 1000)} seconds.`,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

/**
 * Predefined rate limiters for common use cases
 */
export const rateLimiters = {
  // Very strict - for sensitive operations like password reset
  strict: rateLimiter(3, 15 * 60 * 1000), // 3 requests per 15 minutes
  
  // Authentication related
  auth: rateLimiter(5, 15 * 60 * 1000), // 5 requests per 15 minutes
  
  // General API usage
  general: rateLimiter(100, 15 * 60 * 1000), // 100 requests per 15 minutes
  
  // High frequency operations
  frequent: rateLimiter(30, 60 * 1000), // 30 requests per minute
  
  // Bulk operations
  bulk: rateLimiter(10, 60 * 1000), // 10 requests per minute
  
  // Migration operations (very limited)
  migration: rateLimiter(1, 60 * 60 * 1000), // 1 request per hour
  
  // Phone verification
  phoneVerification: rateLimiter(5, 5 * 60 * 1000), // 5 requests per 5 minutes
  
  // Organization registration
  registration: rateLimiter(3, 15 * 60 * 1000), // 3 requests per 15 minutes
};

export default rateLimiter;