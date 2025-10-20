/**
 * Slot Locking Service - TASK-041 (Section 4.3)
 * 
 * Redis-based distributed locking mechanism to prevent double-booking
 * during the appointment booking process.
 * 
 * Features:
 * - Atomic slot reservation using Redis SETNX
 * - 5-minute TTL on locks (auto-expire)
 * - Organization-scoped locks
 * - Lock token validation
 * - Graceful failure handling
 * 
 * Architecture:
 * - Lock Key Format: slot_lock:{orgId}:{providerId}:{date}:{time}
 * - Lock Value: {lockToken}:{phoneNumber}:{timestamp}
 * - TTL: 300 seconds (5 minutes)
 * 
 * Usage:
 * 1. User selects slot → acquireSlotLock()
 * 2. User confirms booking → write to Google Sheets → releaseSlotLock()
 * 3. User times out → lock auto-expires after 5 minutes
 * 
 * @version 1.0
 * @date October 20, 2025
 */

import { getRedisClient, isRedisAvailable } from '../config/redis';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

// Lock configuration
const SLOT_LOCK_TTL_SECONDS = 300; // 5 minutes
const LOCK_PREFIX = 'slot_lock';

export interface SlotLockRequest {
  organizationId: string;
  providerId: string;
  date: string; // ISO date string (YYYY-MM-DD)
  time: string; // HH:MM format
  phoneNumber: string; // User who is locking
  lockToken?: string; // Optional: provide to extend existing lock
}

export interface SlotLockResult {
  success: boolean;
  lockToken?: string; // Return token on success
  message?: string;
  expiresAt?: Date;
  lockedBy?: string; // Phone number of lock holder
  lockedAt?: Date;
}

class SlotLockingService {
  /**
   * Generate lock key for Redis
   */
  private getLockKey(request: SlotLockRequest): string {
    const { organizationId, providerId, date, time } = request;
    return `${LOCK_PREFIX}:${organizationId}:${providerId}:${date}:${time}`;
  }

  /**
   * Generate lock value with metadata
   */
  private getLockValue(lockToken: string, phoneNumber: string): string {
    const timestamp = new Date().toISOString();
    return `${lockToken}:${phoneNumber}:${timestamp}`;
  }

  /**
   * Parse lock value to extract metadata
   */
  private parseLockValue(value: string): { lockToken: string; phoneNumber: string; timestamp: string } | null {
    const parts = value.split(':');
    if (parts.length >= 3) {
      return {
        lockToken: parts[0]!,
        phoneNumber: parts[1]!,
        timestamp: parts.slice(2).join(':'), // Rejoin in case timestamp has colons
      };
    }
    return null;
  }

  /**
   * Acquire slot lock (atomic operation)
   * 
   * @param request - Slot lock request with org, provider, date, time, and user info
   * @returns SlotLockResult with success status and lock token
   */
  async acquireSlotLock(request: SlotLockRequest): Promise<SlotLockResult> {
    try {
      // Check if Redis is available
      if (!isRedisAvailable()) {
        logger.warn('[SlotLockingService] Redis unavailable - lock skipped (UNSAFE)');
        return {
          success: true,
          lockToken: uuidv4(),
          message: 'Redis unavailable - proceeding without lock (unsafe mode)',
        };
      }

      const redis = getRedisClient();
      const lockKey = this.getLockKey(request);
      
      // Generate lock token (or use provided token for extension)
      const lockToken = request.lockToken || uuidv4();
      const lockValue = this.getLockValue(lockToken, request.phoneNumber);

      logger.info('[SlotLockingService] Attempting to acquire lock', {
        lockKey,
        phoneNumber: request.phoneNumber,
        lockToken: lockToken.substring(0, 8) + '...',
      });

      // Attempt atomic lock acquisition with SETNX (SET if Not eXists)
      // NX = Only set if key doesn't exist
      // EX = Set expiry time in seconds
      const result = await redis.set(lockKey, lockValue, {
        NX: true, // Only set if not exists (atomic)
        EX: SLOT_LOCK_TTL_SECONDS,
      });

      if (result === 'OK') {
        // Lock acquired successfully
        const expiresAt = new Date(Date.now() + SLOT_LOCK_TTL_SECONDS * 1000);
        
        logger.info('[SlotLockingService] Lock acquired successfully', {
          lockKey,
          lockToken: lockToken.substring(0, 8) + '...',
          expiresAt,
        });

        return {
          success: true,
          lockToken,
          message: 'Slot locked successfully',
          expiresAt,
        };
      } else {
        // Lock already exists - check who holds it
        const existingValue = await redis.get(lockKey);
        const ttl = await redis.ttl(lockKey);
        
        let lockedBy = 'unknown';
        let lockedAt: Date | undefined;
        
        if (existingValue) {
          const parsed = this.parseLockValue(existingValue);
          if (parsed) {
            lockedBy = parsed.phoneNumber;
            lockedAt = new Date(parsed.timestamp);
            
            // Check if it's the same user (allow re-entry)
            if (parsed.phoneNumber === request.phoneNumber) {
              logger.info('[SlotLockingService] Same user re-acquiring lock', {
                lockKey,
                phoneNumber: request.phoneNumber,
              });
              
              // Extend the lock by refreshing TTL
              await redis.expire(lockKey, SLOT_LOCK_TTL_SECONDS);
              
              return {
                success: true,
                lockToken: parsed.lockToken,
                message: 'Lock extended for same user',
                expiresAt: new Date(Date.now() + SLOT_LOCK_TTL_SECONDS * 1000),
              };
            }
          }
        }

        logger.warn('[SlotLockingService] Lock acquisition failed - slot already locked', {
          lockKey,
          lockedBy,
          ttlSeconds: ttl,
        });

        return {
          success: false,
          message: `Slot is currently being booked by another user. Please try again in ${ttl} seconds.`,
          lockedBy,
          ...(lockedAt && { lockedAt }),
        };
      }
    } catch (error: any) {
      logger.error('[SlotLockingService] Error acquiring lock', {
        error: error.message,
        stack: error.stack,
      });

      // On error, allow booking to proceed (fail open for availability)
      return {
        success: true,
        lockToken: uuidv4(),
        message: 'Lock service error - proceeding without lock (unsafe mode)',
      };
    }
  }

  /**
   * Release slot lock
   * 
   * @param request - Must include lockToken to verify ownership
   * @returns Success status
   */
  async releaseSlotLock(request: SlotLockRequest): Promise<{ success: boolean; message?: string }> {
    try {
      if (!isRedisAvailable()) {
        logger.warn('[SlotLockingService] Redis unavailable - release skipped');
        return { success: true, message: 'Redis unavailable' };
      }

      if (!request.lockToken) {
        return { success: false, message: 'Lock token required for release' };
      }

      const redis = getRedisClient();
      const lockKey = this.getLockKey(request);

      logger.info('[SlotLockingService] Attempting to release lock', {
        lockKey,
        lockToken: request.lockToken.substring(0, 8) + '...',
      });

      // Verify lock ownership before deleting
      const existingValue = await redis.get(lockKey);
      
      if (!existingValue) {
        logger.warn('[SlotLockingService] Lock not found (may have expired)', { lockKey });
        return { success: true, message: 'Lock not found (may have expired)' };
      }

      const parsed = this.parseLockValue(existingValue);
      
      if (!parsed || parsed.lockToken !== request.lockToken) {
        logger.warn('[SlotLockingService] Lock token mismatch - cannot release', {
          lockKey,
          providedToken: request.lockToken.substring(0, 8) + '...',
          actualToken: parsed?.lockToken.substring(0, 8) + '...',
        });
        return { success: false, message: 'Invalid lock token - cannot release' };
      }

      // Delete the lock
      const deleted = await redis.del(lockKey);
      
      if (deleted > 0) {
        logger.info('[SlotLockingService] Lock released successfully', { lockKey });
        return { success: true, message: 'Lock released successfully' };
      } else {
        logger.warn('[SlotLockingService] Lock deletion failed', { lockKey });
        return { success: false, message: 'Lock deletion failed' };
      }
    } catch (error: any) {
      logger.error('[SlotLockingService] Error releasing lock', {
        error: error.message,
        stack: error.stack,
      });
      return { success: false, message: 'Error releasing lock' };
    }
  }

  /**
   * Check if slot is currently locked
   * 
   * @param request - Slot to check
   * @returns Lock status with holder information
   */
  async checkSlotLock(request: Omit<SlotLockRequest, 'phoneNumber'>): Promise<{
    isLocked: boolean;
    lockedBy?: string;
    lockedAt?: Date;
    expiresAt?: Date;
    ttlSeconds?: number;
  }> {
    try {
      if (!isRedisAvailable()) {
        return { isLocked: false };
      }

      const redis = getRedisClient();
      const lockKey = this.getLockKey({ ...request, phoneNumber: '' });

      const [existingValue, ttl] = await Promise.all([
        redis.get(lockKey),
        redis.ttl(lockKey),
      ]);

      if (!existingValue || ttl < 0) {
        return { isLocked: false };
      }

      const parsed = this.parseLockValue(existingValue);
      
      if (!parsed) {
        return { isLocked: true };
      }

      return {
        isLocked: true,
        lockedBy: parsed.phoneNumber,
        lockedAt: new Date(parsed.timestamp),
        expiresAt: new Date(Date.now() + ttl * 1000),
        ttlSeconds: ttl,
      };
    } catch (error: any) {
      logger.error('[SlotLockingService] Error checking lock', {
        error: error.message,
      });
      return { isLocked: false }; // Fail open
    }
  }

  /**
   * Force release all locks for a user (cleanup)
   * Used when user cancels booking flow or times out
   * 
   * @param organizationId - Organization ID
   * @param phoneNumber - User's phone number
   * @returns Number of locks released
   */
  async releaseAllUserLocks(organizationId: string, phoneNumber: string): Promise<number> {
    try {
      if (!isRedisAvailable()) {
        return 0;
      }

      const redis = getRedisClient();
      const pattern = `${LOCK_PREFIX}:${organizationId}:*`;
      
      logger.info('[SlotLockingService] Scanning for user locks', {
        organizationId,
        phoneNumber,
        pattern,
      });

      // Scan for all locks in this organization
      const keys: string[] = [];
      for await (const key of redis.scanIterator({ MATCH: pattern, COUNT: 100 })) {
        keys.push(key);
      }

      // Check each lock and delete if owned by user
      let releasedCount = 0;
      
      for (const key of keys) {
        const value = await redis.get(key);
        if (value) {
          const parsed = this.parseLockValue(value);
          if (parsed && parsed.phoneNumber === phoneNumber) {
            await redis.del(key);
            releasedCount++;
            logger.info('[SlotLockingService] Released user lock', { key, phoneNumber });
          }
        }
      }

      logger.info('[SlotLockingService] User locks released', {
        organizationId,
        phoneNumber,
        count: releasedCount,
      });

      return releasedCount;
    } catch (error: any) {
      logger.error('[SlotLockingService] Error releasing user locks', {
        error: error.message,
      });
      return 0;
    }
  }

  /**
   * Get statistics about active locks
   * Useful for monitoring and debugging
   */
  async getLockStatistics(organizationId?: string): Promise<{
    totalLocks: number;
    locksByOrganization: Record<string, number>;
    oldestLock?: Date;
  }> {
    try {
      if (!isRedisAvailable()) {
        return { totalLocks: 0, locksByOrganization: {} };
      }

      const redis = getRedisClient();
      const pattern = organizationId 
        ? `${LOCK_PREFIX}:${organizationId}:*`
        : `${LOCK_PREFIX}:*`;

      const keys: string[] = [];
      for await (const key of redis.scanIterator({ MATCH: pattern, COUNT: 100 })) {
        keys.push(key);
      }

      const locksByOrg: Record<string, number> = {};
      let oldestTimestamp: Date | undefined;

      for (const key of keys) {
        // Extract org ID from key
        const parts = key.split(':');
        if (parts.length >= 2) {
          const orgId = parts[1]!;
          locksByOrg[orgId] = (locksByOrg[orgId] || 0) + 1;
        }

        // Check lock timestamp
        const value = await redis.get(key);
        if (value) {
          const parsed = this.parseLockValue(value);
          if (parsed) {
            const lockTime = new Date(parsed.timestamp);
            if (!oldestTimestamp || lockTime < oldestTimestamp) {
              oldestTimestamp = lockTime;
            }
          }
        }
      }

      return {
        totalLocks: keys.length,
        locksByOrganization: locksByOrg,
        ...(oldestTimestamp && { oldestLock: oldestTimestamp }),
      };
    } catch (error: any) {
      logger.error('[SlotLockingService] Error getting lock statistics', {
        error: error.message,
      });
      return { totalLocks: 0, locksByOrganization: {} };
    }
  }
}

// Export singleton instance
export const slotLockingService = new SlotLockingService();
export default slotLockingService;
