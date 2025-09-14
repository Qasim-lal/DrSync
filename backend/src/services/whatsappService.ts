/**
 * WhatsApp Multi-Client Service
 * 
 * Handles WhatsApp Business API integration for multiple clients (organizations) 
 * on a single DrSync deployment. Each organization has their own WhatsApp Business
 * number and credentials.
 * 
 * Architecture:
 * - Each organization has separate WhatsApp Business API credentials
 * - Messages are routed based on webhook URL or phone number mapping
 * - All messages are processed in the correct organization context
 * - Google Sheets are used as primary data source for appointments
 * 
 * Multi-Client Features:
 * 1. Credential Management: Secure storage per organization
 * 2. Message Routing: Route to correct organization based on webhook/phone
 * 3. Context Isolation: Ensure organization data separation
 * 4. Family Support: Handle multiple patients per phone number
 * 5. Booking Integration: Direct integration with Google Sheets
 * 
 * @version 1.0
 * @author DrSync Development Team
 * @date September 12, 2025
 */

import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { Prisma } from '../generated/prisma';
import logger from '../utils/logger';
import getPrismaClient from './prisma';
import googleSheetsService from './googleSheetsService';
// import sheetsSyncService from './sheetsSyncService';

// Types for WhatsApp operations
interface WhatsAppCredentials {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  webhookVerifyToken: string;
  appSecret: string;
}

interface WhatsAppClient {
  organizationId: string;
  phoneNumber: string;
  credentials: WhatsAppCredentials;
  isActive: boolean;
  lastActivityAt: Date;
}

interface IncomingMessage {
  from: string;
  to: string;
  message: {
    type: string;
    text?: { body: string };
    interactive?: any;
  };
  timestamp: string;
  organizationId?: string;
}

interface OutgoingMessage {
  to: string;
  type: string;
  text?: { body: string };
  template?: {
    name: string;
    language: { code: string };
    components: any[];
  };
  interactive?: any;
}

interface MessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface AppointmentBookingFlow {
  step: 'GREETING' | 'PATIENT_SELECTION' | 'PROVIDER_SELECTION' | 'DATE_SELECTION' | 'TIME_SELECTION' | 'CONFIRMATION';
  organizationId: string;
  patientPhone: string;
  selectedPatient?: any;
  selectedProvider?: any;
  selectedDate?: string;
  selectedTime?: string;
  duration?: number;
  sessionData: any;
}

class WhatsAppService {
  private clients: Map<string, WhatsAppClient> = new Map();
  private activeSessions: Map<string, AppointmentBookingFlow> = new Map();
  private phoneToOrgMapping: Map<string, string> = new Map();
  
  constructor() {
    this.initializeClients();
  }

  /**
   * Initialize WhatsApp clients for all active organizations
   */
  async initializeClients(): Promise<void> {
    try {
      logger.info('Initializing WhatsApp clients for all organizations');
      
      const prisma = getPrismaClient();
      const organizations = await prisma.organization.findMany({
        where: {
          isActive: true,
          whatsappCredentials: { not: Prisma.JsonNull },
          whatsappPhoneNumber: { not: null }
        },
        select: {
          id: true,
          name: true,
          whatsappPhoneNumber: true,
          whatsappCredentials: true
          // whatsappWebhookUrl: true // Field exists in schema but not in select type
        }
      });

      for (const org of organizations) {
        await this.initializeClient(org.id, org.whatsappCredentials as any);
        this.phoneToOrgMapping.set(org.whatsappPhoneNumber!, org.id);
        logger.info(`Initialized WhatsApp client for ${org.name} (${org.whatsappPhoneNumber})`);
      }

      logger.info(`WhatsApp service initialized with ${organizations.length} clients`);

    } catch (error) {
      logger.error('Error initializing WhatsApp clients:', error);
      throw error;
    }
  }

  /**
   * Initialize specific WhatsApp client for organization
   */
  async initializeClient(organizationId: string, credentials: WhatsAppCredentials): Promise<void> {
    try {
      const prisma = getPrismaClient();
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { whatsappPhoneNumber: true, name: true }
      });

      if (!organization || !organization.whatsappPhoneNumber) {
        throw new Error('Organization not found or WhatsApp phone number not configured');
      }

      const client: WhatsAppClient = {
        organizationId,
        phoneNumber: organization.whatsappPhoneNumber,
        credentials,
        isActive: true,
        lastActivityAt: new Date()
      };

      this.clients.set(organizationId, client);
      this.phoneToOrgMapping.set(organization.whatsappPhoneNumber, organizationId);

      logger.info(`WhatsApp client initialized for organization ${organizationId}`);

    } catch (error) {
      logger.error(`Error initializing WhatsApp client for organization ${organizationId}:`, error);
      throw error;
    }
  }

  /**
   * Route incoming WhatsApp message to correct organization
   */
  async routeMessage(webhookData: any): Promise<void> {
    try {
      logger.info('Processing incoming WhatsApp message');
      
      // Extract message data
      const entry = webhookData.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value?.messages?.[0]) {
        logger.debug('No message found in webhook data');
        return;
      }

      const message = value.messages[0];
      const organizationId = await this.identifyOrganization(value, message);

      if (!organizationId) {
        logger.warn('Could not identify organization for incoming message');
        return;
      }

      // Process message in organization context
      await this.processMessage(message, organizationId);

    } catch (error) {
      logger.error('Error routing WhatsApp message:', error);
      throw error;
    }
  }

  /**
   * Identify organization from webhook data
   */
  private async identifyOrganization(value: any, _message: any): Promise<string | null> {
    try {
      // Method 1: Use phone number mapping
      const businessPhoneId = value.metadata?.phone_number_id;
      if (businessPhoneId) {
        const prisma = getPrismaClient();
        const org = await prisma.organization.findFirst({
          where: { whatsappCredentials: { path: ['phoneNumberId'], equals: businessPhoneId } },
          select: { id: true }
        });
        if (org) return org.id;
      }

      // Method 2: Use display phone number
      const displayPhone = value.metadata?.display_phone_number;
      if (displayPhone) {
        const organizationId = this.phoneToOrgMapping.get(displayPhone);
        if (organizationId) return organizationId;
      }

      // Method 3: Check webhook URL (if available in webhook data)
      // This would require webhook URL to include organization identifier

      return null;

    } catch (error) {
      logger.error('Error identifying organization:', error);
      return null;
    }
  }

  /**
   * Process WhatsApp message in organization context
   */
  async processMessage(message: any, organizationId: string): Promise<void> {
    try {
      const client = this.clients.get(organizationId);
      if (!client) {
        throw new Error(`WhatsApp client not found for organization ${organizationId}`);
      }

      const incomingMessage: IncomingMessage = {
        from: message.from,
        to: message.to || client.phoneNumber,
        message: {
          type: message.type,
          text: message.text,
          interactive: message.interactive
        },
        timestamp: message.timestamp,
        organizationId
      };

      // Update client activity
      client.lastActivityAt = new Date();

      // Log incoming message
      await this.logMessage(incomingMessage, 'INBOUND');

      // Handle based on message type and current session
      if (message.type === 'text') {
        await this.handleTextMessage(incomingMessage);
      } else if (message.type === 'interactive') {
        await this.handleInteractiveMessage(incomingMessage);
      }

    } catch (error) {
      logger.error(`Error processing message for organization ${organizationId}:`, error);
      throw error;
    }
  }

  /**
   * Handle text message (menu-driven appointment booking)
   */
  private async handleTextMessage(message: IncomingMessage): Promise<void> {
    try {
      const sessionKey = `${message.organizationId}_${message.from}`;
      const messageText = message.message.text?.body?.toLowerCase() || '';
      
      // Get or create session
      let session = this.activeSessions.get(sessionKey);
      
      if (!session || messageText === 'start' || messageText === 'menu' || messageText === 'book') {
        // Start new booking session
        session = {
          step: 'GREETING',
          organizationId: message.organizationId!,
          patientPhone: message.from,
          sessionData: {}
        };
        this.activeSessions.set(sessionKey, session);
      }

      // Process based on current step
      switch (session.step) {
        case 'GREETING':
          await this.handleGreeting(session, message);
          break;
        case 'PATIENT_SELECTION':
          await this.handlePatientSelection(session, message, messageText);
          break;
        case 'PROVIDER_SELECTION':
          await this.handleProviderSelection(session, message, messageText);
          break;
        case 'DATE_SELECTION':
          await this.handleDateSelection(session, message, messageText);
          break;
        case 'TIME_SELECTION':
          await this.handleTimeSelection(session, message, messageText);
          break;
        case 'CONFIRMATION':
          await this.handleConfirmation(session, message, messageText);
          break;
      }

    } catch (error) {
      logger.error('Error handling text message:', error);
      await this.sendMessage(message.organizationId!, {
        to: message.from,
        type: 'text',
        text: { body: 'Sorry, something went wrong. Please try again by typing "start".' }
      });
    }
  }

  /**
   * Handle greeting and patient selection
   */
  private async handleGreeting(session: AppointmentBookingFlow, message: IncomingMessage): Promise<void> {
    // Find patients with this phone number (family support)
    const patients = await this.getPatientsByPhone(session.organizationId, message.from);
    
    if (patients.length === 0) {
      // New patient registration
      await this.sendMessage(session.organizationId, {
        to: message.from,
        type: 'text',
        text: { 
          body: `Welcome to our clinic! 👋\n\nI see you're a new patient. To book an appointment, I'll need some basic information.\n\nPlease reply with your full name (First Last):` 
        }
      });
      session.step = 'PATIENT_SELECTION';
      session.sessionData.isNewPatient = true;
    } else if (patients.length === 1) {
      // Single patient - proceed to provider selection
      session.selectedPatient = patients[0];
      await this.showProviderMenu(session, message);
    } else {
      // Multiple patients - show selection menu
      let menuText = `Welcome back! 👋\n\nWho is this appointment for?\n\n`;
      patients.forEach((patient, index) => {
        menuText += `${index + 1}. ${patient.firstName} ${patient.lastName}`;
        if (patient.relationToPrimaryContact && patient.relationToPrimaryContact !== 'self') {
          menuText += ` (${patient.relationToPrimaryContact})`;
        }
        menuText += '\n';
      });
      menuText += `\nReply with the number of your choice:`;

      await this.sendMessage(session.organizationId, {
        to: message.from,
        type: 'text',
        text: { body: menuText }
      });
      
      session.step = 'PATIENT_SELECTION';
      session.sessionData.availablePatients = patients;
    }
  }

  /**
   * Show provider selection menu
   */
  private async showProviderMenu(session: AppointmentBookingFlow, message: IncomingMessage): Promise<void> {
    const providers = await this.getActiveProviders(session.organizationId);
    
    if (providers.length === 0) {
      await this.sendMessage(session.organizationId, {
        to: message.from,
        type: 'text',
        text: { body: 'Sorry, no doctors are available for appointments at this time. Please try again later.' }
      });
      this.activeSessions.delete(`${session.organizationId}_${message.from}`);
      return;
    }

    let menuText = `Great! Please select a doctor:\n\n`;
    providers.forEach((provider, index) => {
      menuText += `${index + 1}. ${provider.title || 'Dr.'} ${provider.firstName} ${provider.lastName}\n`;
      menuText += `   Specialization: ${provider.specialization}\n`;
      if (provider.consultationDuration) {
        menuText += `   Consultation: ${provider.consultationDuration} minutes\n`;
      }
      menuText += '\n';
    });
    menuText += `Reply with the number of your choice:`;

    await this.sendMessage(session.organizationId, {
      to: message.from,
      type: 'text',
      text: { body: menuText }
    });

    session.step = 'PROVIDER_SELECTION';
    session.sessionData.availableProviders = providers;
  }

  /**
   * Handle patient selection
   */
  private async handlePatientSelection(session: AppointmentBookingFlow, message: IncomingMessage, messageText: string): Promise<void> {
    if (session.sessionData.isNewPatient) {
      // Register new patient
      const fullName = message.message.text?.body?.trim() || '';
      const [firstName, ...lastNameParts] = fullName.split(' ');
      const lastName = lastNameParts.join(' ');
      
      if (!firstName || !lastName) {
        await this.sendMessage(session.organizationId, {
          to: message.from,
          type: 'text',
          text: { body: 'Please provide your full name in the format: First Last' }
        });
        return;
      }

      // Create patient in Google Sheets first
      const patientResult = await googleSheetsService.createPatient({
        firstName,
        lastName,
        phone: message.from,
        organizationId: session.organizationId,
        primaryContact: true,
        relationToPrimaryContact: 'self'
      });

      if (!patientResult.success) {
        await this.sendMessage(session.organizationId, {
          to: message.from,
          type: 'text',
          text: { body: 'Sorry, there was an error registering your information. Please try again.' }
        });
        return;
      }

      session.selectedPatient = {
        id: patientResult.patientId,
        firstName,
        lastName,
        phone: message.from
      };

      await this.sendMessage(session.organizationId, {
        to: message.from,
        type: 'text',
        text: { body: `Thank you, ${firstName}! Your information has been saved.` }
      });

    } else {
      // Select from existing patients
      const patientIndex = parseInt(messageText) - 1;
      const availablePatients = session.sessionData.availablePatients || [];
      
      if (patientIndex < 0 || patientIndex >= availablePatients.length) {
        await this.sendMessage(session.organizationId, {
          to: message.from,
          type: 'text',
          text: { body: 'Invalid selection. Please choose a valid number from the list.' }
        });
        return;
      }

      session.selectedPatient = availablePatients[patientIndex];
    }

    // Proceed to provider selection
    await this.showProviderMenu(session, message);
  }

  /**
   * Handle provider selection
   */
  private async handleProviderSelection(session: AppointmentBookingFlow, message: IncomingMessage, messageText: string): Promise<void> {
    const providerIndex = parseInt(messageText) - 1;
    const availableProviders = session.sessionData.availableProviders || [];
    
    if (providerIndex < 0 || providerIndex >= availableProviders.length) {
      await this.sendMessage(session.organizationId, {
        to: message.from,
        type: 'text',
        text: { body: 'Invalid selection. Please choose a valid number from the list.' }
      });
      return;
    }

    session.selectedProvider = availableProviders[providerIndex];
    session.step = 'DATE_SELECTION';

    await this.sendMessage(session.organizationId, {
      to: message.from,
      type: 'text',
      text: { 
        body: `Great! You've selected ${session.selectedProvider.title || 'Dr.'} ${session.selectedProvider.firstName} ${session.selectedProvider.lastName}.\n\nPlease provide your preferred date (YYYY-MM-DD format, e.g., 2025-09-15):` 
      }
    });
  }

  /**
   * Handle date selection
   */
  private async handleDateSelection(session: AppointmentBookingFlow, message: IncomingMessage, messageText: string): Promise<void> {
    const dateMatch = messageText.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!dateMatch) {
      await this.sendMessage(session.organizationId, {
        to: message.from,
        type: 'text',
        text: { body: 'Please provide the date in YYYY-MM-DD format (e.g., 2025-09-15)' }
      });
      return;
    }

    const selectedDate = new Date(messageText);
    if (selectedDate < new Date()) {
      await this.sendMessage(session.organizationId, {
        to: message.from,
        type: 'text',
        text: { body: 'Please select a future date.' }
      });
      return;
    }

    session.selectedDate = messageText;
    session.step = 'TIME_SELECTION';

    // Show available time slots (this would read from Google Sheets)
    await this.sendMessage(session.organizationId, {
      to: message.from,
      type: 'text',
      text: { 
        body: `Available time slots for ${selectedDate.toDateString()}:\n\n1. 9:00 AM\n2. 10:00 AM\n3. 11:00 AM\n4. 2:00 PM\n5. 3:00 PM\n6. 4:00 PM\n\nReply with your preferred time slot number:` 
      }
    });
  }

  /**
   * Handle time selection and create appointment
   */
  private async handleTimeSelection(session: AppointmentBookingFlow, message: IncomingMessage, messageText: string): Promise<void> {
    const timeOptions = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
    const timeIndex = parseInt(messageText) - 1;
    
    if (timeIndex < 0 || timeIndex >= timeOptions.length) {
      await this.sendMessage(session.organizationId, {
        to: message.from,
        type: 'text',
        text: { body: 'Invalid selection. Please choose a valid time slot number.' }
      });
      return;
    }

    const selectedTime = timeOptions[timeIndex];
    const appointmentDateTime = new Date(`${session.selectedDate}T${selectedTime}:00`);

    // Create appointment in Google Sheets (primary data source)
    const appointmentResult = await googleSheetsService.createAppointment({
      patientId: session.selectedPatient!.id,
      providerId: session.selectedProvider!.id,
      scheduledAt: appointmentDateTime,
      duration: session.selectedProvider!.consultationDuration || 30,
      status: 'SCHEDULED',
      bookingSource: 'WHATSAPP',
      organizationId: session.organizationId
    });

    if (appointmentResult.success) {
      // Send confirmation
      await this.sendMessage(session.organizationId, {
        to: message.from,
        type: 'text',
        text: { 
          body: `✅ Appointment Confirmed!\n\n👤 Patient: ${session.selectedPatient!.firstName} ${session.selectedPatient!.lastName}\n👨‍⚕️ Doctor: ${session.selectedProvider!.title || 'Dr.'} ${session.selectedProvider!.firstName} ${session.selectedProvider!.lastName}\n📅 Date: ${appointmentDateTime.toDateString()}\n⏰ Time: ${appointmentDateTime.toLocaleTimeString()}\n\nAppointment ID: ${appointmentResult.appointmentId}\n\nYou will receive a reminder 24 hours before your appointment.` 
        }
      });

      // Clear session
      this.activeSessions.delete(`${session.organizationId}_${message.from}`);
    } else {
      await this.sendMessage(session.organizationId, {
        to: message.from,
        type: 'text',
        text: { 
          body: `Sorry, there was an issue booking your appointment: ${appointmentResult.message || 'Unknown error'}\n\nPlease try again by typing "start".` 
        }
      });
    }
  }

  /**
   * Handle confirmation step
   */
  private async handleConfirmation(session: AppointmentBookingFlow, message: IncomingMessage, messageText: string): Promise<void> {
    if (messageText === 'yes' || messageText === 'confirm') {
      await this.sendMessage(session.organizationId, {
        to: message.from,
        type: 'text',
        text: { body: 'Thank you! Your appointment has been confirmed. You will receive a reminder 24 hours before your appointment.' }
      });
      this.activeSessions.delete(`${session.organizationId}_${message.from}`);
    } else {
      await this.sendMessage(session.organizationId, {
        to: message.from,
        type: 'text',
        text: { body: 'Appointment cancelled. Type "start" to begin booking a new appointment.' }
      });
      this.activeSessions.delete(`${session.organizationId}_${message.from}`);
    }
  }

  /**
   * Handle interactive message (buttons, lists)
   */
  private async handleInteractiveMessage(_message: IncomingMessage): Promise<void> {
    // Handle interactive messages (buttons, lists, etc.)
    logger.debug('Handling interactive message');
  }

  /**
   * Send WhatsApp message using organization's credentials
   */
  async sendMessage(organizationId: string, message: OutgoingMessage): Promise<MessageResponse> {
    try {
      const client = this.clients.get(organizationId);
      if (!client) {
        throw new Error(`WhatsApp client not found for organization ${organizationId}`);
      }

      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${client.credentials.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          ...message
        },
        {
          headers: {
            'Authorization': `Bearer ${client.credentials.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const messageId = response.data?.messages?.[0]?.id;
      
      // Log outgoing message
      await this.logMessage({ ...message as any, organizationId }, 'OUTBOUND', messageId);

      return {
        success: true,
        messageId
      };

    } catch (error) {
      logger.error(`Error sending WhatsApp message for organization ${organizationId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Log WhatsApp message to database
   */
  private async logMessage(message: IncomingMessage, direction: 'INBOUND' | 'OUTBOUND', messageId?: string): Promise<void> {
    try {
      const prisma = getPrismaClient();
      await prisma.whatsAppMessage.create({
        data: {
          id: uuidv4(),
          messageType: message.message.type.toUpperCase() as any,
          content: message.message.text?.body || JSON.stringify(message.message),
          direction: direction as any,
          status: 'SENT',
          organizationId: message.organizationId!,
          patientId: (await this.getPatientIdByPhone(message.organizationId!, direction === 'INBOUND' ? message.from : message.to)) || '',
          language: 'en',
          ...(messageId && { whatsappMessageId: messageId })
        }
      });
    } catch (error) {
      logger.error('Error logging WhatsApp message:', error);
      // Don't throw - logging failure shouldn't break message flow
    }
  }

  /**
   * Helper methods
   */
  private async getPatientsByPhone(organizationId: string, phone: string): Promise<any[]> {
    // This would read from Google Sheets first, fallback to PostgreSQL
    try {
      const prisma = getPrismaClient();
      return await prisma.patient.findMany({
        where: {
          phone: phone,
          organizationId: organizationId
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          // primaryContact: true, // Field exists in schema but not in select type
          relationToPrimaryContact: true
        }
      });
    } catch (error) {
      logger.error('Error getting patients by phone:', error);
      return [];
    }
  }

  private async getActiveProviders(organizationId: string): Promise<any[]> {
    // This would read from Google Sheets first, fallback to PostgreSQL
    try {
      const prisma = getPrismaClient();
      return await prisma.provider.findMany({
        where: {
          organizationId: organizationId,
          isActive: true
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true,
          specialization: true,
          consultationDuration: true,
          consultationFee: true
        }
      });
    } catch (error) {
      logger.error('Error getting active providers:', error);
      return [];
    }
  }

  private async getPatientIdByPhone(organizationId: string, phone: string): Promise<string | null> {
    try {
      const prisma = getPrismaClient();
      const patient = await prisma.patient.findFirst({
        where: { phone, organizationId },
        select: { id: true }
      });
      return patient?.id || null;
    } catch {
      return null;
    }
  }

  /**
   * Get client statistics
   */
  getClientStats(): { [organizationId: string]: { phoneNumber: string; isActive: boolean; lastActivityAt: Date } } {
    const stats: any = {};
    this.clients.forEach((client, orgId) => {
      stats[orgId] = {
        phoneNumber: client.phoneNumber,
        isActive: client.isActive,
        lastActivityAt: client.lastActivityAt
      };
    });
    return stats;
  }

  /**
   * Handle webhook verification
   */
  verifyWebhook(verifyToken: string, organizationId?: string): boolean {
    if (organizationId) {
      const client = this.clients.get(organizationId);
      return client?.credentials.webhookVerifyToken === verifyToken;
    }
    
    // Check all clients if organization not specified
    for (const client of this.clients.values()) {
      if (client.credentials.webhookVerifyToken === verifyToken) {
        return true;
      }
    }
    return false;
  }
}

export const whatsappService = new WhatsAppService();
export default whatsappService;