/**
 * Bilingual Message Templates - TASK-040 (Section 2.4)
 * 
 * Template system for WhatsApp messages supporting both English and Urdu
 * with variable substitution and main menu with language toggle.
 * 
 * Features:
 * - Bilingual templates (en/ur)
 * - Variable substitution: {{variableName}}
 * - Main menu with language toggle option (🌐)
 * - Common appointment management messages
 * - Error messages
 * - Confirmation messages
 * 
 * @version 1.0
 * @date October 19, 2025
 */

export interface BilingualTemplate {
  en: string;
  ur: string;
}

export type TemplateVariables = Record<string, string | number>;

class MessageTemplates {
  // ===== GREETINGS =====

  public readonly GREETING: BilingualTemplate = {
    en: 'Hello! Welcome to {{clinicName}}. How can I help you today?',
    ur: 'السلام علیکم! {{clinicName}} میں خوش آمدید۔ میں آپ کی کیسے مدد کر سکتا ہوں؟',
  };

  public readonly GREETING_WITH_NAME: BilingualTemplate = {
    en: 'Hello {{patientName}}! Welcome back to {{clinicName}}. How can I help you today?',
    ur: 'السلام علیکم {{patientName}}! {{clinicName}} میں واپسی پر خوش آمدید۔ میں آپ کی کیسے مدد کر سکتا ہوں؟',
  };

  // ===== MAIN MENU =====

  public readonly MAIN_MENU: BilingualTemplate = {
    en: `*Main Menu* 📋

Please select an option:

1️⃣ Book Appointment
2️⃣ View My Appointments
3️⃣ Cancel Appointment
4️⃣ Reschedule Appointment
5️⃣ Contact Clinic
0️⃣ 🌐 Change Language

Reply with a number (1-5) or 0 to change language.`,
    ur: `*مین مینو* 📋

براہ کرم ایک آپشن منتخب کریں:

1️⃣ ملاقات بک کریں
2️⃣ میری ملاقاتیں دیکھیں
3️⃣ ملاقات منسوخ کریں
4️⃣ ملاقات دوبارہ شیڈول کریں
5️⃣ کلینک سے رابطہ کریں
0️⃣ 🌐 زبان تبدیل کریں

نمبر (1-5) یا زبان تبدیل کرنے کے لیے 0 کے ساتھ جواب دیں۔`,
  };

  // ===== LANGUAGE SELECTION =====

  public readonly LANGUAGE_SELECTION: BilingualTemplate = {
    en: `*Select Language / زبان منتخب کریں* 🌐

1️⃣ English
2️⃣ اردو

Reply with 1 or 2.
1 یا 2 کے ساتھ جواب دیں۔`,
    ur: `*Select Language / زبان منتخب کریں* 🌐

1️⃣ English
2️⃣ اردو

Reply with 1 or 2.
1 یا 2 کے ساتھ جواب دیں۔`,
  };

  public readonly LANGUAGE_CHANGED: BilingualTemplate = {
    en: '✅ Language changed to English.',
    ur: '✅ زبان اردو میں تبدیل ہو گئی۔',
  };

  // ===== APPOINTMENT BOOKING =====

  public readonly ASK_PATIENT_NAME: BilingualTemplate = {
    en: "What's your name?",
    ur: 'آپ کا نام کیا ہے؟',
  };

  public readonly ASK_PHONE_CONFIRMATION: BilingualTemplate = {
    en: 'Is this your phone number: {{phoneNumber}}?\n\nReply YES to confirm or provide a different number.',
    ur: 'کیا یہ آپ کا فون نمبر ہے: {{phoneNumber}}؟\n\nتصدیق کے لیے ہاں کہیں یا ایک مختلف نمبر فراہم کریں۔',
  };

  public readonly SELECT_PROVIDER: BilingualTemplate = {
    en: `*Select a Doctor* 👨‍⚕️

{{providerList}}

Reply with the doctor number (e.g., 1).`,
    ur: `*ڈاکٹر منتخب کریں* 👨‍⚕️

{{providerList}}

ڈاکٹر نمبر کے ساتھ جواب دیں (مثلاً، 1)۔`,
  };

  public readonly SELECT_DATE: BilingualTemplate = {
    en: `*Select a Date* 📅

{{dateList}}

Reply with the date number (e.g., 1).`,
    ur: `*تاریخ منتخب کریں* 📅

{{dateList}}

تاریخ نمبر کے ساتھ جواب دیں (مثلاً، 1)۔`,
  };

  public readonly SELECT_TIME_SLOT: BilingualTemplate = {
    en: `*Select a Time Slot* ⏰

Available slots for *{{date}}* with *Dr. {{providerName}}*:

{{timeSlots}}

Reply with the time slot number (e.g., 1).`,
    ur: `*وقت کی سلاٹ منتخب کریں* ⏰

*{{date}}* کو *Dr. {{providerName}}* کے ساتھ دستیاب سلاٹس:

{{timeSlots}}

وقت کی سلاٹ نمبر کے ساتھ جواب دیں (مثلاً، 1)۔`,
  };

  public readonly APPOINTMENT_CONFIRMED: BilingualTemplate = {
    en: `✅ *Appointment Confirmed!*

*Patient:* {{patientName}}
*Doctor:* Dr. {{providerName}}
*Date:* {{date}}
*Time:* {{time}}
*Location:* {{clinicName}}

We'll send you a reminder before your appointment.

Reply MENU to return to the main menu.`,
    ur: `✅ *ملاقات کنفرم ہو گئی!*

*مریض:* {{patientName}}
*ڈاکٹر:* Dr. {{providerName}}
*تاریخ:* {{date}}
*وقت:* {{time}}
*مقام:* {{clinicName}}

ہم آپ کو آپ کی ملاقات سے پہلے ایک یاد دہانی بھیجیں گے۔

مین مینو پر واپس جانے کے لیے MENU کے ساتھ جواب دیں۔`,
  };

  // ===== VIEW APPOINTMENTS =====

  public readonly NO_APPOINTMENTS: BilingualTemplate = {
    en: "You don't have any upcoming appointments.\n\nReply MENU to return to the main menu.",
    ur: 'آپ کے پاس کوئی آنے والی ملاقاتیں نہیں ہیں۔\n\nمین مینو پر واپس جانے کے لیے MENU کے ساتھ جواب دیں۔',
  };

  public readonly UPCOMING_APPOINTMENTS: BilingualTemplate = {
    en: `*Your Upcoming Appointments* 📅

{{appointmentList}}

Reply MENU to return to the main menu.`,
    ur: `*آپ کی آنے والی ملاقاتیں* 📅

{{appointmentList}}

مین مینو پر واپس جانے کے لیے MENU کے ساتھ جواب دیں۔`,
  };

  // ===== CANCEL APPOINTMENT =====

  public readonly SELECT_APPOINTMENT_TO_CANCEL: BilingualTemplate = {
    en: `*Select Appointment to Cancel* ❌

{{appointmentList}}

Reply with the appointment number (e.g., 1) or MENU to go back.`,
    ur: `*منسوخ کرنے کے لیے ملاقات منتخب کریں* ❌

{{appointmentList}}

ملاقات نمبر (مثلاً، 1) یا واپس جانے کے لیے MENU کے ساتھ جواب دیں۔`,
  };

  public readonly CONFIRM_CANCELLATION: BilingualTemplate = {
    en: `Are you sure you want to cancel this appointment?

*Doctor:* Dr. {{providerName}}
*Date:* {{date}}
*Time:* {{time}}

Reply YES to confirm or NO to cancel.`,
    ur: `کیا آپ واقعی یہ ملاقات منسوخ کرنا چاہتے ہیں؟

*ڈاکٹر:* Dr. {{providerName}}
*تاریخ:* {{date}}
*وقت:* {{time}}

تصدیق کے لیے ہاں یا منسوخ کرنے کے لیے نہیں کے ساتھ جواب دیں۔`,
  };

  public readonly CANCELLATION_SUCCESS: BilingualTemplate = {
    en: '✅ Your appointment has been cancelled successfully.\n\nReply MENU to return to the main menu.',
    ur: '✅ آپ کی ملاقات کامیابی سے منسوخ ہو گئی ہے۔\n\nمین مینو پر واپس جانے کے لیے MENU کے ساتھ جواب دیں۔',
  };

  // ===== RESCHEDULE APPOINTMENT =====

  public readonly SELECT_APPOINTMENT_TO_RESCHEDULE: BilingualTemplate = {
    en: `*Select Appointment to Reschedule* 🔄

{{appointmentList}}

Reply with the appointment number (e.g., 1) or MENU to go back.`,
    ur: `*دوبارہ شیڈول کرنے کے لیے ملاقات منتخب کریں* 🔄

{{appointmentList}}

ملاقات نمبر (مثلاً، 1) یا واپس جانے کے لیے MENU کے ساتھ جواب دیں۔`,
  };

  public readonly RESCHEDULE_SUCCESS: BilingualTemplate = {
    en: `✅ *Appointment Rescheduled!*

*New Date:* {{date}}
*New Time:* {{time}}
*Doctor:* Dr. {{providerName}}

Reply MENU to return to the main menu.`,
    ur: `✅ *ملاقات دوبارہ شیڈول ہو گئی!*

*نئی تاریخ:* {{date}}
*نیا وقت:* {{time}}
*ڈاکٹر:* Dr. {{providerName}}

مین مینو پر واپس جانے کے لیے MENU کے ساتھ جواب دیں۔`,
  };

  // ===== REMINDERS =====

  public readonly APPOINTMENT_REMINDER_24H: BilingualTemplate = {
    en: `🔔 *Appointment Reminder*

You have an appointment tomorrow:

*Doctor:* Dr. {{providerName}}
*Date:* {{date}}
*Time:* {{time}}
*Location:* {{clinicName}}

Please arrive 10 minutes early. Reply CONFIRM to confirm or RESCHEDULE to change the time.`,
    ur: `🔔 *ملاقات کی یاد دہانی*

آپ کی کل ایک ملاقات ہے:

*ڈاکٹر:* Dr. {{providerName}}
*تاریخ:* {{date}}
*وقت:* {{time}}
*مقام:* {{clinicName}}

براہ کرم 10 منٹ پہلے پہنچیں۔ تصدیق کے لیے CONFIRM یا وقت تبدیل کرنے کے لیے RESCHEDULE کے ساتھ جواب دیں۔`,
  };

  public readonly APPOINTMENT_REMINDER_2H: BilingualTemplate = {
    en: `🔔 *Appointment Reminder*

Your appointment is in 2 hours:

*Doctor:* Dr. {{providerName}}
*Time:* {{time}}
*Location:* {{clinicName}}

See you soon!`,
    ur: `🔔 *ملاقات کی یاد دہانی*

آپ کی ملاقات 2 گھنٹے میں ہے:

*ڈاکٹر:* Dr. {{providerName}}
*وقت:* {{time}}
*مقام:* {{clinicName}}

جلد ملتے ہیں!`,
  };

  // ===== ERRORS =====

  public readonly ERROR_GENERIC: BilingualTemplate = {
    en: "I'm sorry, something went wrong. Please try again or contact our clinic directly.",
    ur: 'معذرت، کچھ غلط ہو گیا۔ براہ کرم دوبارہ کوشش کریں یا ہمارے کلینک سے براہ راست رابطہ کریں۔',
  };

  public readonly ERROR_INVALID_OPTION: BilingualTemplate = {
    en: "I didn't understand that. Please reply with a valid option number.",
    ur: 'مجھے سمجھ نہیں آیا۔ براہ کرم ایک درست آپشن نمبر کے ساتھ جواب دیں۔',
  };

  public readonly ERROR_NO_SLOTS_AVAILABLE: BilingualTemplate = {
    en: 'Sorry, there are no available time slots for this date. Please try a different date.',
    ur: 'معذرت، اس تاریخ کے لیے کوئی دستیاب وقت کی سلاٹس نہیں ہیں۔ براہ کرم ایک مختلف تاریخ آزمائیں۔',
  };

  public readonly ERROR_NO_PROVIDERS: BilingualTemplate = {
    en: 'Sorry, no doctors are available at the moment. Please try again later.',
    ur: 'معذرت، اس وقت کوئی ڈاکٹر دستیاب نہیں ہے۔ براہ کرم بعد میں دوبارہ کوشش کریں۔',
  };

  public readonly ERROR_APPOINTMENT_NOT_FOUND: BilingualTemplate = {
    en: 'Appointment not found. Please try again.',
    ur: 'ملاقات نہیں ملی۔ براہ کرم دوبارہ کوشش کریں۔',
  };

  // ===== CONFIRMATIONS =====

  public readonly ASK_CONTINUE: BilingualTemplate = {
    en: 'Would you like to continue?\n\nReply YES to continue or MENU to return to the main menu.',
    ur: 'کیا آپ جاری رکھنا چاہیں گے؟\n\nجاری رکھنے کے لیے ہاں یا مین مینو پر واپس جانے کے لیے MENU کے ساتھ جواب دیں۔',
  };

  public readonly OPERATION_CANCELLED: BilingualTemplate = {
    en: '❌ Operation cancelled.\n\nReply MENU to return to the main menu.',
    ur: '❌ آپریشن منسوخ ہو گیا۔\n\nمین مینو پر واپس جانے کے لیے MENU کے ساتھ جواب دیں۔',
  };

  // ===== CONTACT CLINIC =====

  public readonly CONTACT_INFO: BilingualTemplate = {
    en: `*Contact Information* 📞

*Clinic:* {{clinicName}}
*Phone:* {{clinicPhone}}
*Address:* {{clinicAddress}}
*Hours:* {{clinicHours}}

Feel free to call us during business hours.

Reply MENU to return to the main menu.`,
    ur: `*رابطے کی معلومات* 📞

*کلینک:* {{clinicName}}
*فون:* {{clinicPhone}}
*پتہ:* {{clinicAddress}}
*اوقات:* {{clinicHours}}

کاروباری اوقات کے دوران ہمیں کال کرنے میں آزاد محسوس کریں۔

مین مینو پر واپس جانے کے لیے MENU کے ساتھ جواب دیں۔`,
  };

  /**
   * Get template text in specified language
   */
  public get(template: BilingualTemplate, language: 'en' | 'ur'): string {
    return template[language];
  }

  /**
   * Get template with variable substitution
   * 
   * Example:
   * const message = templates.format(templates.GREETING, 'en', { clinicName: 'City Hospital' });
   * // Output: "Hello! Welcome to City Hospital. How can I help you today?"
   */
  public format(
    template: BilingualTemplate,
    language: 'en' | 'ur',
    variables: TemplateVariables
  ): string {
    let text = template[language];

    // Replace all variables: {{variableName}}
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      text = text.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return text;
  }

  /**
   * Format appointment list for display
   */
  public formatAppointmentList(
    appointments: Array<{
      id: string;
      providerName: string;
      date: string;
      time: string;
      status: string;
    }>,
    language: 'en' | 'ur'
  ): string {
    if (appointments.length === 0) {
      return language === 'en'
        ? 'No appointments found.'
        : 'کوئی ملاقاتیں نہیں ملیں۔';
    }

    return appointments
      .map((apt, index) => {
        const number = `${index + 1}️⃣`;
        const doctorLabel = language === 'en' ? 'Doctor' : 'ڈاکٹر';
        const dateLabel = language === 'en' ? 'Date' : 'تاریخ';
        const timeLabel = language === 'en' ? 'Time' : 'وقت';
        const statusLabel = language === 'en' ? 'Status' : 'حالت';

        return `${number} *${doctorLabel}:* Dr. ${apt.providerName}
   *${dateLabel}:* ${apt.date}
   *${timeLabel}:* ${apt.time}
   *${statusLabel}:* ${apt.status}`;
      })
      .join('\n\n');
  }

  /**
   * Format provider list for display
   */
  public formatProviderList(
    providers: Array<{
      id: string;
      name: string;
      specialization?: string;
    }>,
    language: 'en' | 'ur'
  ): string {
    if (providers.length === 0) {
      return language === 'en' ? 'No doctors available.' : 'کوئی ڈاکٹر دستیاب نہیں۔';
    }

    return providers
      .map((provider, index) => {
        const number = `${index + 1}️⃣`;
        const specializationText = provider.specialization
          ? language === 'en'
            ? ` (${provider.specialization})`
            : ` (${provider.specialization})`
          : '';

        return `${number} Dr. ${provider.name}${specializationText}`;
      })
      .join('\n');
  }

  /**
   * Format date list for display
   */
  public formatDateList(dates: string[], language: 'en' | 'ur'): string {
    if (dates.length === 0) {
      return language === 'en' ? 'No dates available.' : 'کوئی تاریخیں دستیاب نہیں۔';
    }

    return dates
      .map((date, index) => {
        const number = `${index + 1}️⃣`;
        return `${number} ${date}`;
      })
      .join('\n');
  }

  /**
   * Format time slot list for display
   */
  public formatTimeSlotList(timeSlots: string[], language: 'en' | 'ur'): string {
    if (timeSlots.length === 0) {
      return language === 'en'
        ? 'No time slots available.'
        : 'کوئی وقت کی سلاٹس دستیاب نہیں۔';
    }

    return timeSlots
      .map((slot, index) => {
        const number = `${index + 1}️⃣`;
        return `${number} ${slot}`;
      })
      .join('\n');
  }
}

// Export singleton instance
export const messageTemplates = new MessageTemplates();
export default messageTemplates;
