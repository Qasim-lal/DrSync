/**
 * Language Detection Service - TASK-040 (Section 2)
 * 
 * Automatic language detection for English and Urdu with organization-level
 * preferences and auto-switching capability.
 * 
 * Features:
 * - Unicode-based Urdu script detection (U+0600 to U+06FF)
 * - Keyword-based detection for both languages
 * - Organization-level language preferences (auto-switch)
 * - Redis caching (30-minute TTL)
 * - Patient preference persistence
 * - Confidence scoring (0.0 to 1.0)
 * - Main menu with language toggle support
 * 
 * Target Accuracy: >90%
 * 
 * @version 1.0
 * @date October 19, 2025
 */

import Redis from 'ioredis';
import logger from '../utils/logger';
import getPrismaClient from './prisma';

// Language detection result
export interface LanguageDetectionResult {
  language: 'en' | 'ur';
  confidence: number; // 0.0 to 1.0
  method: 'script' | 'keywords' | 'cached' | 'user_selected' | 'org_default';
  requiresConfirmation: boolean;
}

// Language preference data stored in Redis
interface LanguagePreference {
  language: 'en' | 'ur';
  confidence: number;
  detectedAt: string; // ISO 8601
}

class LanguageDetectionService {
  private redis: Redis;
  private readonly CACHE_PREFIX = 'conversation:language';
  private readonly CACHE_TTL = 1800; // 30 minutes in seconds

  // Urdu Unicode range
  private readonly URDU_UNICODE_RANGE = /[\u0600-\u06FF]/g;

  // Common Urdu keywords (expanded for better detection)
  private readonly URDU_KEYWORDS = [
    // Greetings
    'سلام',
    'السلام عليکم',
    'السلام علیکم',
    'وعلیکم السلام',
    'ہیلو',
    'صبح بخیر',
    'شام بخیر',
    'خوش آمدید',
    
    // Common words
    'شکریہ',
    'نام',
    'ڈاکٹر',
    'وقت',
    'تاریخ',
    'ملاقات',
    'اپوائنٹمنٹ',
    'مریض',
    'کلینک',
    
    // Questions
    'کب',
    'کہاں',
    'کیسے',
    'کیا',
    'کون',
    
    // Actions
    'بک',
    'منسوخ',
    'دیکھیں',
    'دیکھنا',
    'تبدیل',
    'کریں',
    'چاہیے',
    'چاہتا',
    'چاہتے',
    
    // Common phrases
    'مجھے',
    'ضرورت',
    'ہے',
    'ہیں',
    'کی',
    'کا',
    'کے',
    'سے',
    'میں',
    'پر',
    'کو',
    
    // Appointment-related
    'بکنگ',
    'تصدیق',
    'یاد دہانی',
    'رابطہ',
    'معلومات',
    'دستیاب',
    'مدد',
    'براہ کرم',
    'جواب',
    'منتخب',
  ];

  // Common English keywords (expanded for better detection)
  private readonly ENGLISH_KEYWORDS = [
    // Greetings
    'hello',
    'hi',
    'hey',
    'good morning',
    'good afternoon',
    'good evening',
    'assalam alaikum',
    'salam',
    'welcome',
    
    // Common words
    'thank you',
    'thanks',
    'please',
    'name',
    'doctor',
    'dr',
    'appointment',
    'patient',
    'clinic',
    'hospital',
    
    // Questions
    'when',
    'where',
    'how',
    'what',
    'who',
    'which',
    
    // Actions
    'book',
    'cancel',
    'view',
    'see',
    'check',
    'reschedule',
    'change',
    'confirm',
    'need',
    'want',
    'would like',
    'help',
    'menu',
    
    // Appointment-related
    'booking',
    'schedule',
    'available',
    'availability',
    'slot',
    'time',
    'date',
    'today',
    'tomorrow',
    'contact',
    'information',
    'info',
    'reply',
    'select',
  ];

  constructor() {
    const redisConfig: any = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    };

    if (process.env.REDIS_PASSWORD) {
      redisConfig.password = process.env.REDIS_PASSWORD;
    }

    this.redis = new Redis(redisConfig);
    logger.info('[LanguageDetection] Service initialized');
  }

  /**
   * Detect language from message text with organization-level preferences
   * 
   * Detection Strategy (per TASK-040 Section 2.2):
   * 1. Check organization's language setting from database
   * 2. Detect language from current message
   * 3. If detected ≠ org default AND confidence >0.8 → AUTO-SWITCH
   * 4. If no strong detection, use org default or cached preference
   */
  public async detectLanguage(
    messageText: string,
    organizationId: string,
    phoneNumber: string
  ): Promise<LanguageDetectionResult> {
    try {
      // Optimize: Detect from text immediately (synchronous, no I/O)
      const detected = this.detectFromText(messageText);
      
      // If high confidence detection (>0.9), skip DB lookups for performance
      if (detected.confidence >= 0.9) {
        // Still cache the result asynchronously (don't await)
        this.saveLanguagePreference(
          organizationId,
          phoneNumber,
          detected.language,
          detected.confidence
        ).catch(() => {/* ignore cache errors */});
        
        return detected;
      }

      // Step 1 & 2: Parallelize cache and org language lookups
      const [cached, orgLanguage] = await Promise.all([
        this.getCachedLanguage(organizationId, phoneNumber),
        this.getOrganizationLanguage(organizationId),
      ]);
      
      if (cached) {
        logger.debug('[LanguageDetection] Using cached preference', {
          organizationId,
          phoneNumber,
          language: cached.language,
        });

        return {
          language: cached.language,
          confidence: 1.0,
          method: 'cached',
          requiresConfirmation: false,
        };
      }

      // Step 4: Auto-switch logic (ACTION #6 Decision)
      // If detected language differs from org default AND confidence >0.8 → AUTO-SWITCH
      if (
        orgLanguage &&
        detected.language !== orgLanguage &&
        detected.confidence > 0.8
      ) {
        logger.info('[LanguageDetection] Auto-switching language', {
          organizationId,
          phoneNumber,
          orgDefault: orgLanguage,
          detected: detected.language,
          confidence: detected.confidence,
        });

        // Save auto-switched language to cache
        await this.saveLanguagePreference(
          organizationId,
          phoneNumber,
          detected.language,
          detected.confidence
        );

        return {
          ...detected,
          method: 'script', // Keep original detection method
          requiresConfirmation: false,
        };
      }

      // Step 5: If org default exists and no strong detection, use org default
      if (orgLanguage && detected.confidence < 0.8) {
        logger.debug('[LanguageDetection] Using organization default', {
          organizationId,
          language: orgLanguage,
        });

        return {
          language: orgLanguage,
          confidence: 1.0,
          method: 'org_default',
          requiresConfirmation: false,
        };
      }

      // Step 6: Use detected language (if confidence is good)
      if (detected.confidence >= 0.7) {
        await this.saveLanguagePreference(
          organizationId,
          phoneNumber,
          detected.language,
          detected.confidence
        );

        return detected;
      }

      // Step 7: Ambiguous - require user confirmation
      return {
        language: 'en', // Default to English
        confidence: 0.3,
        method: 'keywords',
        requiresConfirmation: true,
      };
    } catch (error: any) {
      logger.error('[LanguageDetection] Detection failed', {
        organizationId,
        phoneNumber,
        error: error.message,
      });

      // Fallback to English
      return {
        language: 'en',
        confidence: 0.5,
        method: 'keywords',
        requiresConfirmation: false,
      };
    }
  }

  /**
   * Detect language from text using Unicode and keyword analysis
   * 
   * Per TASK-040 Section 2.4 (Language Detection Strategy)
   */
  private detectFromText(messageText: string): LanguageDetectionResult {
    if (!messageText || messageText.trim().length === 0) {
      return {
        language: 'en',
        confidence: 0.3,
        method: 'keywords',
        requiresConfirmation: true,
      };
    }

    const text = messageText.trim();

    // Step 1: Urdu script detection (Unicode range U+0600 to U+06FF)
    const urduChars = text.match(this.URDU_UNICODE_RANGE);
    const urduCharCount = urduChars ? urduChars.length : 0;
    const totalChars = text.replace(/\s/g, '').length;
    const urduPercentage = totalChars > 0 ? urduCharCount / totalChars : 0;

    // High confidence Urdu detection (>50% Urdu characters)
    if (urduPercentage > 0.5) {
      return {
        language: 'ur',
        confidence: 0.9,
        method: 'script',
        requiresConfirmation: false,
      };
    }

    // Medium confidence Urdu detection (20-50% Urdu characters)
    if (urduPercentage > 0.2) {
      return {
        language: 'ur',
        confidence: 0.7,
        method: 'script',
        requiresConfirmation: false,
      };
    }

    // Step 2: Keyword-based detection
    const textLower = text.toLowerCase();

    const urduMatches = this.URDU_KEYWORDS.filter((keyword) =>
      text.includes(keyword)
    ).length;

    const englishMatches = this.ENGLISH_KEYWORDS.filter((keyword) =>
      textLower.includes(keyword)
    ).length;

    // Urdu keyword matches (2+ keywords)
    if (urduMatches >= 2) {
      return {
        language: 'ur',
        confidence: 0.8,
        method: 'keywords',
        requiresConfirmation: false,
      };
    }

    // English keyword matches (2+ keywords)
    if (englishMatches >= 2) {
      return {
        language: 'en',
        confidence: 0.8,
        method: 'keywords',
        requiresConfirmation: false,
      };
    }

    // Single keyword match
    if (urduMatches === 1 && englishMatches === 0) {
      return {
        language: 'ur',
        confidence: 0.6,
        method: 'keywords',
        requiresConfirmation: false,
      };
    }

    if (englishMatches === 1 && urduMatches === 0) {
      return {
        language: 'en',
        confidence: 0.6,
        method: 'keywords',
        requiresConfirmation: false,
      };
    }

    // Step 3: Ambiguous - require confirmation
    return {
      language: 'en', // Default to English
      confidence: 0.3,
      method: 'keywords',
      requiresConfirmation: true,
    };
  }

  /**
   * Get organization's default language setting
   * 
   * TASK-040A Integration: Now reads from NotificationSettings first,
   * then falls back to Organization.language
   */
  private async getOrganizationLanguage(
    organizationId: string
  ): Promise<'en' | 'ur' | null> {
    try {
      // TASK-040A: Use NotificationSettingsService for language preference
      const notificationSettingsService = (await import('./notificationSettingsService')).default;
      const language = await notificationSettingsService.getOrganizationLanguage(organizationId);
      return language;
    } catch (error: any) {
      logger.error('[LanguageDetection] Failed to get org language', {
        organizationId,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Get cached language preference from Redis
   */
  private async getCachedLanguage(
    organizationId: string,
    phoneNumber: string
  ): Promise<LanguagePreference | null> {
    try {
      const key = `${this.CACHE_PREFIX}:${organizationId}:${phoneNumber}`;
      const cached = await this.redis.get(key);

      if (cached) {
        return JSON.parse(cached) as LanguagePreference;
      }

      return null;
    } catch (error: any) {
      logger.error('[LanguageDetection] Failed to get cached language', {
        organizationId,
        phoneNumber,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Save language preference to Redis and PostgreSQL
   * 
   * Redis: 30-minute TTL (conversation context)
   * PostgreSQL: Permanent (Patient.preferredLanguage)
   */
  public async saveLanguagePreference(
    organizationId: string,
    phoneNumber: string,
    language: 'en' | 'ur',
    confidence: number
  ): Promise<void> {
    try {
      const preferenceData: LanguagePreference = {
        language,
        confidence,
        detectedAt: new Date().toISOString(),
      };

      // Save to Redis with 30-minute TTL
      const key = `${this.CACHE_PREFIX}:${organizationId}:${phoneNumber}`;
      await this.redis.setex(
        key,
        this.CACHE_TTL,
        JSON.stringify(preferenceData)
      );

      logger.info('[LanguageDetection] Saved language preference to cache', {
        organizationId,
        phoneNumber,
        language,
        ttl: this.CACHE_TTL,
      });

      // Save to PostgreSQL (Patient.preferredLanguage)
      try {
        const prisma = getPrismaClient();
        await prisma.patient.updateMany({
          where: {
            phone: phoneNumber,
            organizationId: organizationId,
          },
          data: {
            preferredLanguage: language,
            updatedAt: new Date(),
          },
        });

        logger.info('[LanguageDetection] Updated patient language preference', {
          organizationId,
          phoneNumber,
          language,
        });
      } catch (dbError: any) {
        // Non-critical error - patient may not exist yet
        logger.debug('[LanguageDetection] Could not update patient language', {
          organizationId,
          phoneNumber,
          error: dbError.message,
        });
      }
    } catch (error: any) {
      logger.error('[LanguageDetection] Failed to save language preference', {
        organizationId,
        phoneNumber,
        error: error.message,
      });
    }
  }

  /**
   * Clear cached language preference (for manual language switch)
   */
  public async clearLanguageCache(
    organizationId: string,
    phoneNumber: string
  ): Promise<void> {
    try {
      const key = `${this.CACHE_PREFIX}:${organizationId}:${phoneNumber}`;
      await this.redis.del(key);

      logger.info('[LanguageDetection] Cleared language cache', {
        organizationId,
        phoneNumber,
      });
    } catch (error: any) {
      logger.error('[LanguageDetection] Failed to clear language cache', {
        organizationId,
        phoneNumber,
        error: error.message,
      });
    }
  }

  /**
   * Check if text is a language switch command
   */
  public isLanguageSwitchCommand(messageText: string): {
    isSwitch: boolean;
    targetLanguage?: 'en' | 'ur';
  } {
    const text = messageText.trim().toLowerCase();

    // English switch commands
    const englishCommands = [
      'switch to english',
      'english',
      'en',
      'change to english',
      'use english',
    ];

    // Urdu switch commands
    const urduCommands = ['اردو میں تبدیل کریں', 'اردو', 'ur'];

    // Check English commands
    if (englishCommands.some((cmd) => text.includes(cmd))) {
      return { isSwitch: true, targetLanguage: 'en' };
    }

    // Check Urdu commands (exact match for Urdu text)
    if (urduCommands.some((cmd) => messageText.includes(cmd))) {
      return { isSwitch: true, targetLanguage: 'ur' };
    }

    // Check menu option for language toggle (0 or 🌐)
    if (text === '0' || messageText.includes('🌐')) {
      return { isSwitch: true }; // No target language, show selection menu
    }

    return { isSwitch: false };
  }

  /**
   * Close Redis connection
   */
  public async close(): Promise<void> {
    this.redis.disconnect();
    logger.info('[LanguageDetection] Service closed');
  }
}

// Export singleton instance
export const languageDetectionService = new LanguageDetectionService();
export default languageDetectionService;
