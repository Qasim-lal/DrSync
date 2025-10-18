/**
 * Encryption/Decryption Utilities
 * 
 * Provides AES-256-CBC encryption for sensitive data storage.
 * Used primarily for WhatsApp API credentials and other sensitive configuration.
 * 
 * @version 1.0
 * @author DrSync Development Team
 * @date October 17, 2025
 */

import crypto from 'crypto';
import logger from './logger';

const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32; // 256 bits

/**
 * Get encryption key from environment or generate one
 * 
 * IMPORTANT: In production, ENCRYPTION_KEY must be set in environment variables
 * and must be a 32-byte (64 hex characters) string.
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  
  if (!envKey) {
    logger.warn('ENCRYPTION_KEY not set in environment - using fallback (NOT SAFE FOR PRODUCTION)');
    // Generate a key for development only
    return crypto.randomBytes(KEY_LENGTH);
  }
  
  try {
    // Parse hex string to buffer and ensure correct length
    const keyBuffer = Buffer.from(envKey, 'hex');
    
    if (keyBuffer.length !== KEY_LENGTH) {
      throw new Error(`Encryption key must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} hex characters), got ${keyBuffer.length} bytes`);
    }
    
    return keyBuffer;
  } catch (error) {
    logger.error('Invalid ENCRYPTION_KEY format:', error);
    throw new Error('Invalid encryption key configuration');
  }
}

/**
 * Encrypt sensitive data using AES-256-CBC
 * 
 * @param data - Plain text data to encrypt
 * @returns Encrypted data in format: "iv:encryptedData" (hex encoded)
 * 
 * @example
 * const encrypted = encryptData('my-secret-token');
 * // Returns: "a1b2c3...def:1234567...890abc"
 */
export function encryptData(data: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16); // 128-bit IV for AES
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Return IV and encrypted data separated by colon
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    logger.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt encrypted data using AES-256-CBC
 * 
 * @param encryptedData - Encrypted data in format: "iv:encryptedData" (hex encoded)
 * @returns Decrypted plain text data
 * 
 * @example
 * const decrypted = decryptData('a1b2c3...def:1234567...890abc');
 * // Returns: "my-secret-token"
 */
export function decryptData(encryptedData: string): string {
  try {
    const key = getEncryptionKey();
    
    // Split IV and encrypted data
    const parts = encryptedData.split(':');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    const decrypted = decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    logger.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Generate a secure encryption key
 * 
 * Use this to generate a new ENCRYPTION_KEY for your environment.
 * 
 * @returns 32-byte encryption key as hex string
 * 
 * @example
 * const key = generateEncryptionKey();
 * console.log(`ENCRYPTION_KEY=${key}`);
 * // Add to .env file
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Hash sensitive data for comparison (one-way)
 * 
 * Use for data that needs to be verified but not decrypted (e.g., passwords).
 * 
 * @param data - Data to hash
 * @returns SHA-256 hash as hex string
 */
export function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate a secure random token
 * 
 * Use for webhook verify tokens, API keys, etc.
 * 
 * @param bytes - Number of random bytes (default: 32)
 * @returns Random token as hex string
 */
export function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export default {
  encryptData,
  decryptData,
  generateEncryptionKey,
  hashData,
  generateSecureToken,
};
