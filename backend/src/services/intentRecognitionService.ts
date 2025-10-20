/**
 * Intent Recognition Service - TASK-040 (Section 3)
 * 
 * Classifies user messages into actionable intents with entity extraction.
 * Uses keyword-based pattern matching for both English and Urdu.
 * 
 * Features:
 * - 13 intent types classification
 * - Entity extraction (dates, times, names)
 * - Context-aware classification
 * - Menu number mapping (0-5)
 * - Confidence scoring
 * 
 * Target Accuracy: >85%
 * 
 * @version 1.0
 * @date October 19, 2025
 */

import logger from '../utils/logger';

// Intent types (13 total as per TASK-040 Section 3)
export enum Intent {
  BOOK_APPOINTMENT = 'BOOK_APPOINTMENT',
  CANCEL_APPOINTMENT = 'CANCEL_APPOINTMENT',
  RESCHEDULE_APPOINTMENT = 'RESCHEDULE_APPOINTMENT',
  VIEW_APPOINTMENTS = 'VIEW_APPOINTMENTS',
  GET_CLINIC_INFO = 'GET_CLINIC_INFO',
  GET_DOCTOR_INFO = 'GET_DOCTOR_INFO',
  GET_AVAILABILITY = 'GET_AVAILABILITY',
  CONFIRM_APPOINTMENT = 'CONFIRM_APPOINTMENT',
  CHECK_STATUS = 'CHECK_STATUS',
  HELP_MENU = 'HELP_MENU',
  SWITCH_LANGUAGE = 'SWITCH_LANGUAGE',
  LANGUAGE_MENU_SELECT = 'LANGUAGE_MENU_SELECT',
  UNKNOWN = 'UNKNOWN',
}

// Intent classification result
export interface IntentClassificationResult {
  intent: Intent;
  confidence: number; // 0.0 to 1.0
  entities: ExtractedEntities;
  matchedKeywords: string[];
}

// Extracted entities from message
export interface ExtractedEntities {
  dates?: string[];
  times?: string[];
  names?: string[];
  phoneNumbers?: string[];
  menuOption?: number;
}

class IntentRecognitionService {
  // Intent keyword patterns (bilingual)
  private readonly INTENT_PATTERNS = {
    [Intent.BOOK_APPOINTMENT]: {
      en: ['book', 'appointment', 'schedule', 'make appointment', 'need appointment', 'want appointment', 'booking', 'reserve'],
      ur: ['بک', 'ملاقات', 'بکنگ', 'اپوائنٹمنٹ', 'کرنا', 'چاہیے', 'ضرورت'],
    },
    [Intent.CANCEL_APPOINTMENT]: {
      en: ['cancel my appointment', 'cancel appointment', 'remove appointment', 'delete appointment', 'cancel', 'delete', 'dont want', 'not coming'],
      ur: ['منسوخ کریں', 'منسوخ', 'ختم', 'نہیں آ سکتا', 'نہیں'],
    },
    [Intent.RESCHEDULE_APPOINTMENT]: {
      en: ['reschedule my appointment', 'reschedule appointment', 'change my appointment', 'change appointment', 'different time', 'move appointment', 'reschedule', 'change', 'postpone', 'change time', 'change date'],
      ur: ['شیڈول تبدیل', 'وقت تبدیل', 'تاریخ تبدیل', 'تبدیل', 'دوبارہ', 'شیڈول'],
    },
    [Intent.VIEW_APPOINTMENTS]: {
      en: ['view', 'see', 'show', 'my appointments', 'check appointments', 'list appointments', 'upcoming'],
      ur: ['دیکھیں', 'دیکھنا', 'میری ملاقاتیں', 'لسٹ'],
    },
    [Intent.GET_CLINIC_INFO]: {
      en: ['clinic', 'contact', 'address', 'location', 'phone number', 'where', 'hours', 'timing', 'information'],
      ur: ['کلینک', 'رابطہ', 'پتہ', 'مقام', 'کہاں', 'معلومات', 'فون'],
    },
    [Intent.GET_DOCTOR_INFO]: {
      en: ['doctor', 'doctors', 'dr', 'specialist', 'available doctors', 'who', 'which doctor'],
      ur: ['ڈاکٹر', 'ڈاکٹرز', 'کون', 'دستیاب'],
    },
    [Intent.GET_AVAILABILITY]: {
      en: ['available', 'availability', 'slots', 'free', 'when available', 'open slots'],
      ur: ['دستیاب', 'خالی', 'سلاٹ', 'کب'],
    },
    [Intent.CONFIRM_APPOINTMENT]: {
      en: ['confirm', 'yes', 'ok', 'okay', 'correct', 'confirmed', 'proceed'],
      ur: ['تصدیق', 'ہاں', 'ٹھیک', 'صحیح', 'جی'],
    },
    [Intent.CHECK_STATUS]: {
      en: ['status', 'check status', 'appointment status', 'confirmed?'],
      ur: ['حالت', 'حیثیت', 'چیک'],
    },
    [Intent.HELP_MENU]: {
      en: ['help', 'menu', 'options', 'main menu', 'what can you do', 'commands', 'start'],
      ur: ['مدد', 'مینو', 'آپشن', 'مین مینو', 'شروع'],
    },
    [Intent.SWITCH_LANGUAGE]: {
      en: ['switch language', 'change language', 'english', 'urdu', 'language'],
      ur: ['زبان', 'تبدیل کریں', 'اردو', 'انگلش'],
    },
  };

  /**
   * Classify user intent from message text
   * 
   * @param messageText User's message
   * @param language Detected language
   * @param conversationContext Optional context (current step, etc.)
   */
  public classifyIntent(
    messageText: string,
    language: 'en' | 'ur',
    conversationContext?: {
      currentStep?: string;
      awaitingConfirmation?: boolean;
      lastIntent?: Intent;
    }
  ): IntentClassificationResult {
    const text = messageText.trim().toLowerCase();
    
    try {
      // Step 1: Check for menu number selection (0-5)
      const menuIntent = this.checkMenuNumber(text);
      if (menuIntent) {
        return menuIntent;
      }

      // Step 2: Extract entities first
      const entities = this.extractEntities(messageText);

      // Step 3: Context-aware classification
      if (conversationContext?.awaitingConfirmation) {
        const confirmationIntent = this.classifyConfirmation(text, language);
        if (confirmationIntent) {
          return {
            ...confirmationIntent,
            entities,
          };
        }
      }

      // Step 4: Pattern-based classification
      const patternIntent = this.classifyByPatterns(text, language);
      
      return {
        ...patternIntent,
        entities,
      };
    } catch (error: any) {
      logger.error('[IntentRecognition] Classification failed', {
        error: error.message,
        messageText,
      });

      return {
        intent: Intent.UNKNOWN,
        confidence: 0.0,
        entities: {},
        matchedKeywords: [],
      };
    }
  }

  /**
   * Check if message is a menu number selection (0-5)
   */
  private checkMenuNumber(text: string): IntentClassificationResult | null {
    const trimmed = text.trim();
    
    // Menu mappings (as per TASK-040 Section 3)
    const menuMap: { [key: string]: Intent } = {
      '0': Intent.LANGUAGE_MENU_SELECT,
      '1': Intent.BOOK_APPOINTMENT,
      '2': Intent.VIEW_APPOINTMENTS,
      '3': Intent.CANCEL_APPOINTMENT,
      '4': Intent.RESCHEDULE_APPOINTMENT,
      '5': Intent.GET_CLINIC_INFO,
    };

    // Check for menu emoji
    if (trimmed.includes('🌐') || trimmed === '0') {
      return {
        intent: Intent.LANGUAGE_MENU_SELECT,
        confidence: 1.0,
        entities: { menuOption: 0 },
        matchedKeywords: ['menu:0'],
      };
    }

    // Check for single digit menu selection
    if (/^[1-5]$/.test(trimmed)) {
      const option = parseInt(trimmed);
      const mappedIntent = menuMap[trimmed];
      if (mappedIntent) {
        return {
          intent: mappedIntent,
          confidence: 1.0,
          entities: { menuOption: option },
          matchedKeywords: [`menu:${option}`],
        };
      }
    }

    return null;
  }

  /**
   * Classify confirmation/rejection messages
   */
  private classifyConfirmation(
    text: string,
    language: 'en' | 'ur'
  ): IntentClassificationResult | null {
    const confirmKeywords = {
      en: ['yes', 'yeah', 'yep', 'ok', 'okay', 'confirm', 'correct', 'right', 'proceed'],
      ur: ['ہاں', 'جی', 'ٹھیک', 'صحیح', 'تصدیق'],
    };

    const rejectKeywords = {
      en: ['no', 'nope', 'cancel', 'wrong', 'incorrect', 'not'],
      ur: ['نہیں', 'نا', 'غلط', 'منسوخ'],
    };

    const confirmMatches = confirmKeywords[language].filter(kw => text.includes(kw));
    const rejectMatches = rejectKeywords[language].filter(kw => text.includes(kw));

    if (confirmMatches.length > 0) {
      return {
        intent: Intent.CONFIRM_APPOINTMENT,
        confidence: 0.9,
        entities: {},
        matchedKeywords: confirmMatches,
      };
    }

    if (rejectMatches.length > 0) {
      return {
        intent: Intent.CANCEL_APPOINTMENT,
        confidence: 0.8,
        entities: {},
        matchedKeywords: rejectMatches,
      };
    }

    return null;
  }

  /**
   * Classify intent using keyword pattern matching
   */
  private classifyByPatterns(
    text: string,
    language: 'en' | 'ur'
  ): IntentClassificationResult {
    const scores: { intent: Intent; score: number; keywords: string[]; phraseWeight: number }[] = [];

    // Check each intent pattern
    for (const [intentKey, patterns] of Object.entries(this.INTENT_PATTERNS)) {
      const intent = intentKey as Intent;
      const keywords = patterns[language] || [];
      
      const matches = keywords.filter(keyword => {
        // For multi-word keywords, check if all words are present
        if (keyword.includes(' ')) {
          return text.includes(keyword);
        }
        // For single words, check if keyword appears in text
        // Note: \b doesn't work with Unicode, so we use simple includes() for Urdu
        if (language === 'ur') {
          return text.includes(keyword);
        }
        // For English, use word boundaries
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        return regex.test(text);
      });

      if (matches.length > 0) {
        // Calculate phrase weight: multi-word phrases get higher weight
        const phraseWeight = matches.reduce((weight, kw) => {
          return weight + (kw.includes(' ') ? 3 : 1); // Multi-word = 3x weight
        }, 0);
        
        scores.push({
          intent,
          score: matches.length,
          keywords: matches,
          phraseWeight,
        });
      }
    }

    // Sort by phrase weight first (prioritize multi-word matches), then by score
    scores.sort((a, b) => {
      if (b.phraseWeight !== a.phraseWeight) {
        return b.phraseWeight - a.phraseWeight;
      }
      return b.score - a.score;
    });

    // Return best match or UNKNOWN
    if (scores.length > 0) {
      const best = scores[0];
      if (best) {
        const confidence = Math.min(best.score * 0.3 + 0.5, 1.0); // Scale: 1 match = 0.8, 2+ matches = 1.0

        return {
          intent: best.intent,
          confidence,
          entities: {},
          matchedKeywords: best.keywords,
        };
      }
    }

    return {
      intent: Intent.UNKNOWN,
      confidence: 0.0,
      entities: {},
      matchedKeywords: [],
    };
  }

  /**
   * Extract entities from message text
   */
  private extractEntities(text: string): ExtractedEntities {
    const entities: ExtractedEntities = {};

    // Extract dates
    entities.dates = this.extractDates(text);

    // Extract times
    entities.times = this.extractTimes(text);

    // Extract phone numbers
    entities.phoneNumbers = this.extractPhoneNumbers(text);

    // Extract names (basic pattern)
    entities.names = this.extractNames(text);

    return entities;
  }

  /**
   * Extract dates from text
   * Supports: tomorrow, today, DD/MM, DD-MM, DD/MM/YYYY
   */
  private extractDates(text: string): string[] {
    const dates: string[] = [];

    // Relative dates (English)
    if (/\b(tomorrow|tmrw)\b/i.test(text)) {
      dates.push('tomorrow');
    }
    if (/\b(today)\b/i.test(text)) {
      dates.push('today');
    }
    if (/\b(next week)\b/i.test(text)) {
      dates.push('next week');
    }

    // Relative dates (Urdu)
    if (text.includes('کل')) {
      dates.push('tomorrow');
    }
    if (text.includes('آج')) {
      dates.push('today');
    }

    // DD/MM or DD-MM format
    const datePattern = /\b(\d{1,2})[\/\-](\d{1,2})\b/g;
    let match;
    while ((match = datePattern.exec(text)) !== null) {
      dates.push(match[0]);
    }

    // DD/MM/YYYY format
    const fullDatePattern = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/g;
    while ((match = fullDatePattern.exec(text)) !== null) {
      dates.push(match[0]);
    }

    return dates;
  }

  /**
   * Extract times from text
   * Supports: 10am, 10:30am, 10:30 AM, 1400, 14:00
   */
  private extractTimes(text: string): string[] {
    const times: string[] = [];

    // 12-hour format with am/pm
    const time12Pattern = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/gi;
    let match;
    while ((match = time12Pattern.exec(text)) !== null) {
      times.push(match[0]);
    }

    // 24-hour format
    const time24Pattern = /\b([01]?\d|2[0-3]):([0-5]\d)\b/g;
    while ((match = time24Pattern.exec(text)) !== null) {
      times.push(match[0]);
    }

    return times;
  }

  /**
   * Extract phone numbers from text
   * Supports: +92xxxxxxxxxx, 03xxxxxxxxx, +92-xxx-xxxxxxx
   */
  private extractPhoneNumbers(text: string): string[] {
    const phones: string[] = [];

    // Pakistani phone numbers
    const phonePattern = /(?:\+92|0)?3\d{9}|\+92\d{10}/g;
    let match;
    while ((match = phonePattern.exec(text)) !== null) {
      phones.push(match[0]);
    }

    return phones;
  }

  /**
   * Extract names from text (basic capitalized word detection)
   */
  private extractNames(text: string): string[] {
    const names: string[] = [];

    // Look for capitalized words (2-15 characters)
    const namePattern = /\b[A-Z][a-z]{1,14}\b/g;
    let match;
    while ((match = namePattern.exec(text)) !== null) {
      // Exclude common words
      const commonWords = ['Doctor', 'Appointment', 'Clinic', 'Hospital'];
      if (!commonWords.includes(match[0])) {
        names.push(match[0]);
      }
    }

    return names;
  }

  /**
   * Get intent display name (for logging/debugging)
   */
  public getIntentDisplayName(intent: Intent, language: 'en' | 'ur'): string {
    const names: { [key in Intent]: { en: string; ur: string } } = {
      [Intent.BOOK_APPOINTMENT]: { en: 'Book Appointment', ur: 'ملاقات بک کریں' },
      [Intent.CANCEL_APPOINTMENT]: { en: 'Cancel Appointment', ur: 'ملاقات منسوخ کریں' },
      [Intent.RESCHEDULE_APPOINTMENT]: { en: 'Reschedule Appointment', ur: 'دوبارہ شیڈول کریں' },
      [Intent.VIEW_APPOINTMENTS]: { en: 'View Appointments', ur: 'ملاقاتیں دیکھیں' },
      [Intent.GET_CLINIC_INFO]: { en: 'Clinic Info', ur: 'کلینک معلومات' },
      [Intent.GET_DOCTOR_INFO]: { en: 'Doctor Info', ur: 'ڈاکٹر معلومات' },
      [Intent.GET_AVAILABILITY]: { en: 'Check Availability', ur: 'دستیابی چیک کریں' },
      [Intent.CONFIRM_APPOINTMENT]: { en: 'Confirm', ur: 'تصدیق' },
      [Intent.CHECK_STATUS]: { en: 'Check Status', ur: 'حالت چیک کریں' },
      [Intent.HELP_MENU]: { en: 'Help/Menu', ur: 'مدد/مینو' },
      [Intent.SWITCH_LANGUAGE]: { en: 'Switch Language', ur: 'زبان تبدیل کریں' },
      [Intent.LANGUAGE_MENU_SELECT]: { en: 'Language Menu', ur: 'زبان مینو' },
      [Intent.UNKNOWN]: { en: 'Unknown', ur: 'نامعلوم' },
    };

    return names[intent][language];
  }
}

// Export singleton instance
export const intentRecognitionService = new IntentRecognitionService();
export default intentRecognitionService;
