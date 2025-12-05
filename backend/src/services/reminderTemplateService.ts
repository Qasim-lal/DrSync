/**
 * Reminder Template Service - Bilingual Message Templates
 * 
 * Handles generation of personalized reminder messages in English and Urdu.
 * Supports variable substitution, date/time formatting, and organization-specific customization.
 * 
 * Features:
 * - Bilingual templates (English/Urdu)
 * - Variable substitution ({{patientName}}, {{doctorName}}, etc.)
 * - Date/time formatting per language
 * - Organization-specific template overrides
 * - Emoji support for visual appeal
 * - Template caching for performance
 * 
 * @version 1.0
 * @author DrSync Development Team
 * @date December 4, 2025
 */

import { logger } from '../utils/logger';
import { ReminderType } from '@prisma/client';
import { format } from 'date-fns';
import { enUS, arSA } from 'date-fns/locale';

// Template variable interface
export interface TemplateVariables {
  patientName: string;
  doctorName: string;
  doctorTitle?: string;
  clinicName: string;
  clinicAddress?: string;
  clinicPhone?: string;
  appointmentDate: Date;
  appointmentTime: string;
  appointmentDuration?: number;
  appointmentType?: string;
  medicationName?: string;
  dosage?: string;
  instructions?: string;
  [key: string]: any; // Allow additional custom variables
}

// Template definition interface
interface MessageTemplate {
  id: string;
  type: ReminderType | 'CUSTOM';
  language: 'en' | 'ur';
  content: string;
  variables: string[];
}

// Built-in templates
const BUILTIN_TEMPLATES: MessageTemplate[] = [
  // English Appointment Reminders
  {
    id: 'reminder_24h_en',
    type: ReminderType.REMINDER_24H,
    language: 'en',
    content: `🔔 Hi {{patientName}}, this is a reminder: Your appointment with {{doctorName}} is tomorrow at {{appointmentTime}}.

📅 Date: {{appointmentDate}}
🏥 Clinic: {{clinicName}}
📍 Location: {{clinicAddress}}

Reply CONFIRM to confirm or CANCEL to cancel.`,
    variables: ['patientName', 'doctorName', 'appointmentTime', 'appointmentDate', 'clinicName', 'clinicAddress']
  },
  {
    id: 'reminder_2h_en',
    type: ReminderType.REMINDER_2H,
    language: 'en',
    content: `⏰ Your appointment with {{doctorName}} is in 2 hours at {{appointmentTime}}.

🏥 {{clinicName}}
📍 {{clinicAddress}}

Please arrive 10 minutes early.`,
    variables: ['doctorName', 'appointmentTime', 'clinicName', 'clinicAddress']
  },
  {
    id: 'reminder_30min_en',
    type: ReminderType.REMINDER_30MIN,
    language: 'en',
    content: `⚠️ URGENT: Your appointment with {{doctorName}} is in 30 minutes!

📍 {{clinicName}}, {{clinicAddress}}
🕐 Time: {{appointmentTime}}

Please leave now if you haven't already.`,
    variables: ['doctorName', 'appointmentTime', 'clinicName', 'clinicAddress']
  },

  // Urdu Appointment Reminders
  {
    id: 'reminder_24h_ur',
    type: ReminderType.REMINDER_24H,
    language: 'ur',
    content: `🔔 سلام {{patientName}}، یاد دہانی: آپ کی {{doctorName}} کے ساتھ ملاقات کل {{appointmentTime}} بجے ہے۔

📅 تاریخ: {{appointmentDate}}
🏥 کلینک: {{clinicName}}
📍 پتہ: {{clinicAddress}}

تصدیق کے لیے CONFIRM یا منسوخ کرنے کے لیے CANCEL کا جواب دیں۔`,
    variables: ['patientName', 'doctorName', 'appointmentTime', 'appointmentDate', 'clinicName', 'clinicAddress']
  },
  {
    id: 'reminder_2h_ur',
    type: ReminderType.REMINDER_2H,
    language: 'ur',
    content: `⏰ سلام {{patientName}}، آپ کی {{doctorName}} کے ساتھ ملاقات 2 گھنٹے میں {{appointmentTime}} بجے ہے۔

🏥 {{clinicName}}
📍 {{clinicAddress}}

براہ کرم 10 منٹ پہلے پہنچیں۔`,
    variables: ['patientName', 'doctorName', 'appointmentTime', 'clinicName', 'clinicAddress']
  },
  {
    id: 'reminder_30min_ur',
    type: ReminderType.REMINDER_30MIN,
    language: 'ur',
    content: `⚠️ فوری {{patientName}}: آپ کی {{doctorName}} کے ساتھ ملاقات 30 منٹ میں ہے!

📍 {{clinicName}}, {{clinicAddress}}
🕐 وقت: {{appointmentTime}}

اگر آپ ابھی تک نہیں نکلے تو براہ کرم ابھی روانہ ہوں۔`,
    variables: ['patientName', 'doctorName', 'appointmentTime', 'clinicName', 'clinicAddress']
  },

  // English Follow-ups
  {
    id: 'followup_same_day_en',
    type: ReminderType.FOLLOWUP_SAME_DAY,
    language: 'en',
    content: `✅ Thank you for visiting {{clinicName}}, {{patientName}}!

We hope your consultation with {{doctorName}} went well. How are you feeling?

Reply:
1 - Feeling better
2 - Same as before
3 - Need assistance`,
    variables: ['patientName', 'clinicName', 'doctorName']
  },
  {
    id: 'followup_next_day_en',
    type: ReminderType.FOLLOWUP_NEXT_DAY,
    language: 'en',
    content: `💊 Follow-up: Hi {{patientName}}, it's been a day since your visit.

Are you following the treatment plan prescribed by {{doctorName}}?

📋 Remember to:
• Take prescribed medications on time
• Follow dietary instructions
• Rest adequately

Reply if you have any concerns.`,
    variables: ['patientName', 'doctorName']
  },

  // Urdu Follow-ups
  {
    id: 'followup_same_day_ur',
    type: ReminderType.FOLLOWUP_SAME_DAY,
    language: 'ur',
    content: `✅ {{clinicName}} میں آنے کا شکریہ، {{patientName}}!

ہمیں امید ہے کہ {{doctorName}} کے ساتھ آپ کا معائنہ اچھا رہا۔ آپ کیسا محسوس کر رہے ہیں؟

جواب دیں:
1 - بہتر محسوس کر رہا ہوں
2 - پہلے جیسا ہی
3 - مدد چاہیے`,
    variables: ['patientName', 'clinicName', 'doctorName']
  },
  {
    id: 'followup_next_day_ur',
    type: ReminderType.FOLLOWUP_NEXT_DAY,
    language: 'ur',
    content: `💊 فالو اپ: سلام {{patientName}}، آپ کی آمد کو ایک دن ہو گیا۔

کیا آپ {{doctorName}} کے تجویز کردہ علاج پر عمل کر رہے ہیں؟

📋 یاد رکھیں:
• تجویز کردہ دوائیں وقت پر لیں
• خوراک کی ہدایات پر عمل کریں
• مناسب آرام کریں

اگر کوئی پریشانی ہو تو جواب دیں۔`,
    variables: ['patientName', 'doctorName']
  },

  // No-show follow-up
  {
    id: 'no_show_followup_en',
    type: ReminderType.NO_SHOW_FOLLOWUP,
    language: 'en',
    content: `❓ Hi {{patientName}}, we missed you at your appointment with {{doctorName}} at {{clinicName}} today.

Is everything okay? Would you like to reschedule?

📞 Call us: {{clinicPhone}}
💬 Reply RESCHEDULE to book a new appointment`,
    variables: ['patientName', 'doctorName', 'clinicName', 'clinicPhone']
  },
  {
    id: 'no_show_followup_ur',
    type: ReminderType.NO_SHOW_FOLLOWUP,
    language: 'ur',
    content: `❓ سلام {{patientName}}، ہم آج {{doctorName}} کے ساتھ آپ کی ملاقات میں آپ کو یاد کر رہے ہیں۔

کیا سب ٹھیک ہے؟ کیا آپ نئی تاریخ مقرر کرنا چاہتے ہیں؟

📞 ہمیں کال کریں: {{clinicPhone}}
💬 نئی ملاقات بک کرنے کے لیے RESCHEDULE کا جواب دیں`,
    variables: ['patientName', 'doctorName', 'clinicPhone']
  }
];

class ReminderTemplateService {
  private templateCache: Map<string, MessageTemplate>;

  constructor() {
    this.templateCache = new Map();
    this.loadBuiltinTemplates();
    logger.info('Reminder template service initialized');
  }

  /**
   * Load built-in templates into cache
   */
  private loadBuiltinTemplates(): void {
    BUILTIN_TEMPLATES.forEach(template => {
      this.templateCache.set(template.id, template);
    });
    logger.info(`Loaded ${BUILTIN_TEMPLATES.length} built-in templates`);
  }

  /**
   * Generate reminder message from template
   * 
   * @param reminderType - Type of reminder
   * @param language - Language (en/ur)
   * @param variables - Template variables
   * @param customTemplate - Optional custom template override
   * @returns Generated message
   */
  generateMessage(
    reminderType: ReminderType | 'CUSTOM',
    language: 'en' | 'ur',
    variables: TemplateVariables,
    customTemplate?: string
  ): string {
    try {
      // Use custom template if provided
      if (customTemplate) {
        return this.renderTemplate(customTemplate, variables, language);
      }

      // Find template by type and language
      const templateId = `${this.getReminderTypeKey(reminderType)}_${language}`;
      const template = this.templateCache.get(templateId);

      if (!template) {
        logger.warn(`Template not found: ${templateId}, using fallback`);
        return this.getFallbackMessage(reminderType, language, variables);
      }

      return this.renderTemplate(template.content, variables, language);

    } catch (error) {
      logger.error('Error generating reminder message:', error);
      return this.getFallbackMessage(reminderType, language, variables);
    }
  }

  /**
   * Render template with variable substitution
   * 
   * @param template - Template string
   * @param variables - Template variables
   * @param language - Language for date/time formatting
   * @returns Rendered message
   */
  private renderTemplate(
    template: string,
    variables: TemplateVariables,
    language: 'en' | 'ur'
  ): string {
    let rendered = template;

    // Format dates and times
    const formattedDate = this.formatDate(variables.appointmentDate, language);
    const formattedTime = variables.appointmentTime;

    // Prepare substitution map
    const substitutions: Record<string, string> = {
      patientName: variables.patientName || 'Patient',
      doctorName: this.formatDoctorName(variables),
      clinicName: variables.clinicName || 'Our Clinic',
      clinicAddress: variables.clinicAddress || '',
      clinicPhone: variables.clinicPhone || '',
      appointmentDate: formattedDate,
      appointmentTime: formattedTime || '',
      appointmentType: variables.appointmentType || 'Consultation',
      medicationName: variables.medicationName || '',
      dosage: variables.dosage || '',
      instructions: variables.instructions || ''
    };

    // Include any additional custom variables (convert to strings)
    Object.keys(variables).forEach(key => {
      if (!(key in substitutions)) {
        const value = variables[key];
        substitutions[key] = typeof value === 'string' ? value : String(value || '');
      }
    });

    // Replace all {{variable}} placeholders
    Object.entries(substitutions).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      rendered = rendered.replace(regex, value || '');
    });

    // Clean up any remaining unreplaced variables
    rendered = rendered.replace(/\{\{[^}]+\}\}/g, '');

    // Clean up extra whitespace
    rendered = rendered.replace(/\n{3,}/g, '\n\n').trim();

    return rendered;
  }

  /**
   * Format doctor name with title
   */
  private formatDoctorName(variables: TemplateVariables): string {
    const doctorName = variables.doctorName;
    
    // If doctor name already starts with a title (English or Urdu), return as-is
    if (doctorName.startsWith('Dr.') || 
        doctorName.startsWith('Prof.') || 
        doctorName.startsWith('Dr ') ||
        doctorName.startsWith('ڈاکٹر') || // ڈاکٹر (Doctor in Urdu)
        doctorName.startsWith('پروفیسر')) {  // پروفیسر (Professor in Urdu)
      return doctorName;
    }
    
    // Otherwise, add the title
    const title = variables.doctorTitle || 'Dr.';
    return `${title} ${doctorName}`;
  }

  /**
   * Format date based on language
   */
  private formatDate(date: Date, language: 'en' | 'ur'): string {
    try {
      const locale = language === 'ur' ? arSA : enUS;
      
      // Format: "Monday, December 4, 2025" or equivalent in Urdu
      return format(date, 'PPPP', { locale });

    } catch (error) {
      logger.error('Error formatting date:', error);
      return date.toLocaleDateString();
    }
  }

  /**
   * Get reminder type key for template lookup
   */
  private getReminderTypeKey(reminderType: ReminderType | 'CUSTOM'): string {
    const keyMap: Record<string, string> = {
      [ReminderType.REMINDER_24H]: 'reminder_24h',
      [ReminderType.REMINDER_2H]: 'reminder_2h',
      [ReminderType.REMINDER_30MIN]: 'reminder_30min',
      [ReminderType.FOLLOWUP_SAME_DAY]: 'followup_same_day',
      [ReminderType.FOLLOWUP_NEXT_DAY]: 'followup_next_day',
      [ReminderType.NO_SHOW_FOLLOWUP]: 'no_show_followup',
      'CUSTOM': 'custom'
    };

    return keyMap[reminderType] || 'reminder_24h';
  }

  /**
   * Get fallback message if template not found
   */
  private getFallbackMessage(
    _reminderType: ReminderType | 'CUSTOM',
    language: 'en' | 'ur',
    variables: TemplateVariables
  ): string {
    const doctorName = this.formatDoctorName(variables);
    const date = this.formatDate(variables.appointmentDate, language);

    if (language === 'ur') {
      return `🔔 یاد دہانی: آپ کی ${doctorName} کے ساتھ ملاقات ${date} کو ${variables.appointmentTime} بجے ہے۔\n\n${variables.clinicName}`;
    } else {
      return `🔔 Reminder: Your appointment with ${doctorName} is on ${date} at ${variables.appointmentTime}.\n\n${variables.clinicName}`;
    }
  }

  /**
   * Add custom template to cache
   * 
   * @param organizationId - Organization ID
   * @param reminderType - Reminder type
   * @param language - Language
   * @param content - Template content
   */
  addCustomTemplate(
    organizationId: string,
    reminderType: ReminderType,
    language: 'en' | 'ur',
    content: string
  ): void {
    const templateId = `custom_${organizationId}_${this.getReminderTypeKey(reminderType)}_${language}`;
    
    const template: MessageTemplate = {
      id: templateId,
      type: reminderType,
      language,
      content,
      variables: this.extractVariables(content)
    };

    this.templateCache.set(templateId, template);
    logger.info(`Added custom template: ${templateId}`);
  }

  /**
   * Extract variable names from template content
   */
  private extractVariables(content: string): string[] {
    const regex = /\{\{([^}]+)\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (match[1]) {
        variables.push(match[1]);
      }
    }

    return [...new Set(variables)]; // Remove duplicates
  }

  /**
   * Get available templates for a reminder type
   */
  getAvailableTemplates(reminderType: ReminderType): MessageTemplate[] {
    return Array.from(this.templateCache.values())
      .filter(template => template.type === reminderType);
  }

  /**
   * Preview template with sample data
   */
  previewTemplate(
    reminderType: ReminderType,
    language: 'en' | 'ur'
  ): string {
    const sampleVariables: TemplateVariables = {
      patientName: 'Ahmed Khan',
      doctorName: 'Dr. Sarah Ali',
      clinicName: 'City Medical Clinic',
      clinicAddress: '123 Main Street, Karachi',
      clinicPhone: '+92-300-1234567',
      appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      appointmentTime: '10:00 AM',
      appointmentType: 'General Consultation'
    };

    return this.generateMessage(reminderType, language, sampleVariables);
  }

  /**
   * Validate template syntax
   */
  validateTemplate(content: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for unclosed variables
    const openBraces = (content.match(/\{\{/g) || []).length;
    const closeBraces = (content.match(/\}\}/g) || []).length;

    if (openBraces !== closeBraces) {
      errors.push('Unmatched braces in template');
    }

    // Check for empty variables
    if (/\{\{\s*\}\}/.test(content)) {
      errors.push('Empty variable placeholders found');
    }

    // Check minimum length
    if (content.trim().length < 10) {
      errors.push('Template content too short');
    }

    // Check maximum length (WhatsApp limit)
    if (content.length > 4096) {
      errors.push('Template content exceeds WhatsApp message limit (4096 characters)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.templateCache.clear();
    this.loadBuiltinTemplates();
    logger.info('Template cache cleared and reloaded');
  }
}

// Export singleton instance
export default new ReminderTemplateService();
