/**
 * WhatsApp Message Helper Methods
 * 
 * Convenience methods for creating different types of WhatsApp messages.
 * Supports text, interactive (buttons/lists), and template messages.
 * 
 * @version 1.0
 * @author DrSync Development Team
 * @date October 17, 2025
 */

interface OutgoingMessage {
  to: string;
  type: string;
  text?: { body: string; preview_url?: boolean };
  template?: {
    name: string;
    language: { code: string };
    components: any[];
  };
  interactive?: any;
}

/**
 * Create a text message
 * 
 * @param to - Recipient phone number (with country code)
 * @param text - Message text (supports WhatsApp formatting)
 * @param previewUrl - Enable link previews (default: true)
 * @returns Outgoing message object
 * 
 * @example
 * const msg = createTextMessage('+923001234567', 'Hello! 👋');
 */
export function createTextMessage(
  to: string,
  text: string,
  previewUrl: boolean = true
): OutgoingMessage {
  return {
    to,
    type: 'text',
    text: {
      preview_url: previewUrl,
      body: text
    }
  };
}

/**
 * Create an interactive button message
 * 
 * @param to - Recipient phone number
 * @param bodyText - Message body text
 * @param buttons - Array of buttons (max 3)
 * @param headerText - Optional header text
 * @param footerText - Optional footer text
 * @returns Outgoing message object
 * 
 * @example
 * const msg = createButtonMessage(
 *   '+923001234567',
 *   'Would you like to book an appointment?',
 *   [
 *     { id: 'book_yes', title: 'Yes, book now' },
 *     { id: 'book_no', title: 'Maybe later' }
 *   ]
 * );
 */
export function createButtonMessage(
  to: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>,
  headerText?: string,
  footerText?: string
): OutgoingMessage {
  if (buttons.length > 3) {
    throw new Error('Maximum 3 buttons allowed in button message');
  }

  const interactive: any = {
    type: 'button',
    body: { text: bodyText },
    action: {
      buttons: buttons.map(btn => ({
        type: 'reply',
        reply: {
          id: btn.id,
          title: btn.title.substring(0, 20) // WhatsApp limit: 20 chars
        }
      }))
    }
  };

  if (headerText) {
    interactive.header = { type: 'text', text: headerText };
  }

  if (footerText) {
    interactive.footer = { text: footerText };
  }

  return {
    to,
    type: 'interactive',
    interactive
  };
}

/**
 * Create an interactive list message
 * 
 * @param to - Recipient phone number
 * @param bodyText - Message body text
 * @param buttonText - Text for list button (e.g., "View Options")
 * @param sections - Array of sections with rows
 * @param headerText - Optional header text
 * @param footerText - Optional footer text
 * @returns Outgoing message object
 * 
 * @example
 * const msg = createListMessage(
 *   '+923001234567',
 *   'Please select a doctor:',
 *   'Select Doctor',
 *   [
 *     {
 *       title: 'Available Doctors',
 *       rows: [
 *         { id: 'dr_1', title: 'Dr. Ahmed', description: 'Cardiologist' },
 *         { id: 'dr_2', title: 'Dr. Fatima', description: 'Pediatrician' }
 *       ]
 *     }
 *   ]
 * );
 */
export function createListMessage(
  to: string,
  bodyText: string,
  buttonText: string,
  sections: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>,
  headerText?: string,
  footerText?: string
): OutgoingMessage {
  if (sections.length > 10) {
    throw new Error('Maximum 10 sections allowed in list message');
  }

  const totalRows = sections.reduce((sum, section) => sum + section.rows.length, 0);
  if (totalRows > 10) {
    throw new Error('Maximum 10 rows allowed across all sections');
  }

  const interactive: any = {
    type: 'list',
    body: { text: bodyText },
    action: {
      button: buttonText.substring(0, 20), // WhatsApp limit: 20 chars
      sections: sections.map(section => ({
        title: section.title,
        rows: section.rows.map(row => ({
          id: row.id,
          title: row.title.substring(0, 24), // WhatsApp limit: 24 chars
          description: row.description?.substring(0, 72) // WhatsApp limit: 72 chars
        }))
      }))
    }
  };

  if (headerText) {
    interactive.header = { type: 'text', text: headerText };
  }

  if (footerText) {
    interactive.footer = { text: footerText };
  }

  return {
    to,
    type: 'interactive',
    interactive
  };
}

/**
 * Create a template message
 * 
 * Templates must be pre-approved by WhatsApp.
 * 
 * @param to - Recipient phone number
 * @param templateName - Name of approved template
 * @param languageCode - Language code (e.g., 'en', 'en_US', 'ur')
 * @param components - Template components with parameters
 * @returns Outgoing message object
 * 
 * @example
 * const msg = createTemplateMessage(
 *   '+923001234567',
 *   'appointment_reminder',
 *   'en',
 *   [
 *     {
 *       type: 'body',
 *       parameters: [
 *         { type: 'text', text: 'Dr. Ahmed' },
 *         { type: 'text', text: 'October 18, 2025 at 2:00 PM' }
 *       ]
 *     }
 *   ]
 * );
 */
export function createTemplateMessage(
  to: string,
  templateName: string,
  languageCode: string,
  components: any[]
): OutgoingMessage {
  return {
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components
    }
  };
}

/**
 * Create a media message (image, document, etc.)
 * 
 * @param to - Recipient phone number
 * @param mediaType - Type of media ('image', 'document', 'audio', 'video')
 * @param mediaUrl - URL or media ID
 * @param caption - Optional caption (for image/video)
 * @param filename - Optional filename (for document)
 * @returns Outgoing message object
 * 
 * @example
 * const msg = createMediaMessage(
 *   '+923001234567',
 *   'image',
 *   'https://example.com/appointment-card.png',
 *   'Your appointment details'
 * );
 */
export function createMediaMessage(
  to: string,
  mediaType: 'image' | 'document' | 'audio' | 'video',
  mediaUrl: string,
  caption?: string,
  filename?: string
): OutgoingMessage {
  const media: any = {
    link: mediaUrl
  };

  if (caption && (mediaType === 'image' || mediaType === 'video')) {
    media.caption = caption;
  }

  if (filename && mediaType === 'document') {
    media.filename = filename;
  }

  return {
    to,
    type: mediaType,
    [mediaType]: media
  };
}

/**
 * Format phone number for WhatsApp API
 * 
 * Ensures phone number is in correct format (with country code, no + or spaces)
 * 
 * @param phoneNumber - Phone number in any format
 * @returns Formatted phone number
 * 
 * @example
 * formatPhoneNumber('+92 300 1234567') // Returns: '923001234567'
 */
export function formatPhoneNumber(phoneNumber: string): string {
  // Remove all non-numeric characters except + at start
  let formatted = phoneNumber.replace(/[^\d+]/g, '');
  
  // Remove leading + if present
  if (formatted.startsWith('+')) {
    formatted = formatted.substring(1);
  }
  
  return formatted;
}

/**
 * Validate phone number format
 * 
 * @param phoneNumber - Phone number to validate
 * @returns True if valid format
 */
export function isValidPhoneNumber(phoneNumber: string): boolean {
  const formatted = formatPhoneNumber(phoneNumber);
  // Must be 10-15 digits
  return /^\d{10,15}$/.test(formatted);
}

export default {
  createTextMessage,
  createButtonMessage,
  createListMessage,
  createTemplateMessage,
  createMediaMessage,
  formatPhoneNumber,
  isValidPhoneNumber,
};
