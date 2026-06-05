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
import axios, { AxiosError } from 'axios';
import { Prisma } from '@prisma/client';
import logger from '../utils/logger';
import getPrismaClient from './prisma';
import googleSheetsService from './googleSheetsService';
import { decryptData } from '../utils/encryption';
import Queue, { Job } from 'bull';
import Redis from 'ioredis';
import { getRedisConnectionConfig } from '../config/redis';
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
  private messageQueue: Queue.Queue;
  private redis: Redis;
  private readonly RATE_LIMIT = 80; // WhatsApp Cloud API limit: 80 msg/sec
  private readonly RATE_WINDOW = 1; // 1 second
  private initializationPromise: Promise<void>;
  
  constructor() {
    const redisConfig = getRedisConnectionConfig();

    // Initialize Redis for rate limiting
    this.redis = new Redis(redisConfig);
    
    // Initialize Bull Queue for message queueing
    this.messageQueue = new Queue('whatsapp-messages', {
      redis: redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
    
    // Process queued messages
    this.messageQueue.process(async (job: Job) => {
      const { organizationId, message } = job.data;
      return await this.sendMessageDirect(organizationId, message);
    });
    
    // Queue event handlers
    this.messageQueue.on('completed', (job: Job, result: any) => {
      logger.info(`Message queue job completed`, { jobId: job.id, result });
    });
    
    this.messageQueue.on('failed', (job: Job | undefined, error: Error) => {
      logger.error(`Message queue job failed`, { jobId: job?.id, error: error.message });
    });
    
    // Initialize clients asynchronously but store the promise
    this.initializationPromise = this.initializeClients();
  }

  /**
   * Ensure clients are initialized before performing operations
   */
  private async ensureInitialized(): Promise<void> {
    await this.initializationPromise;
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

      // Clear existing mappings to ensure clean state
      this.clients.clear();
      this.phoneToOrgMapping.clear();

      for (const org of organizations) {
        await this.initializeClient(org.id, org.whatsappCredentials as any);
        // Phone mapping is set inside initializeClient to ensure atomicity
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

      // Decrypt credentials if they're encrypted
      const decryptedCredentials = this.decryptCredentials(credentials);

      const client: WhatsAppClient = {
        organizationId,
        phoneNumber: organization.whatsappPhoneNumber,
        credentials: decryptedCredentials,
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
   * Decrypt WhatsApp credentials
   * Handles both encrypted and plain credentials for backward compatibility
   */
  private decryptCredentials(credentials: WhatsAppCredentials): WhatsAppCredentials {
    try {
      // Check if credentials are encrypted (contains ':' separator from IV:data format)
      const needsDecryption = (value: string) => value && value.includes(':') && value.split(':').length === 2;

      return {
        ...credentials,
        accessToken: needsDecryption(credentials.accessToken) 
          ? decryptData(credentials.accessToken) 
          : credentials.accessToken,
        appSecret: needsDecryption(credentials.appSecret)
          ? decryptData(credentials.appSecret)
          : credentials.appSecret,
        webhookVerifyToken: needsDecryption(credentials.webhookVerifyToken)
          ? decryptData(credentials.webhookVerifyToken)
          : credentials.webhookVerifyToken,
      };
    } catch (error) {
      logger.error('Error decrypting credentials:', error);
      // Return original credentials if decryption fails
      return credentials;
    }
  }

  /**
   * Check rate limit for organization
   * Returns true if within limit, false if limit exceeded
   */
  private async checkRateLimit(organizationId: string): Promise<boolean> {
    try {
      const key = `whatsapp:ratelimit:${organizationId}`;
      const current = await this.redis.incr(key);
      
      // Set expiry on first increment
      if (current === 1) {
        await this.redis.expire(key, this.RATE_WINDOW);
      }
      
      const withinLimit = current <= this.RATE_LIMIT;
      
      if (!withinLimit) {
        logger.warn(`Rate limit exceeded for organization ${organizationId}`, {
          current,
          limit: this.RATE_LIMIT
        });
      }
      
      return withinLimit;
    } catch (error) {
      logger.error('Error checking rate limit:', error);
      // Allow on error to avoid blocking messages
      return true;
    }
  }

  /**
   * Route incoming WhatsApp message to correct organization
   */
  async routeMessage(webhookData: any): Promise<void> {
    try {
      logger.info('Processing incoming WhatsApp message');
      
      // Validate webhook data structure
      if (!webhookData || typeof webhookData !== 'object') {
        throw new Error('Invalid webhook data: must be a valid object');
      }

      if (!webhookData.entry || !Array.isArray(webhookData.entry)) {
        throw new Error('Invalid webhook data: missing or invalid entry array');
      }
      
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
      // Method 1: Use phone number mapping (with database query)
      const businessPhoneId = value.metadata?.phone_number_id;
      if (businessPhoneId) {
        try {
          const prisma = getPrismaClient();
          const org = await prisma.organization.findFirst({
            where: { whatsappCredentials: { path: ['phoneNumberId'], equals: businessPhoneId } },
            select: { id: true }
          });
          if (org) return org.id;
        } catch (dbError) {
          logger.error('Database error in organization identification:', dbError);
          // Continue to fallback methods if database fails
        }
      }

      // Method 2: Use display phone number (in-memory mapping - more reliable)
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
   * Handles rate limiting and queueing automatically
   */
  async sendMessage(organizationId: string, message: OutgoingMessage): Promise<MessageResponse> {
    try {
      // Ensure clients are initialized
      await this.ensureInitialized();
      
      // Check rate limit
      const withinLimit = await this.checkRateLimit(organizationId);
      
      if (!withinLimit) {
        // Queue message if rate limit exceeded
        logger.info(`Queueing message due to rate limit`, { organizationId });
        await this.messageQueue.add({ organizationId, message });
        
        return {
          success: true,
          error: 'Message queued due to rate limit'
        };
      }
      
      // Send directly if within rate limit
      return await this.sendMessageDirect(organizationId, message);
      
    } catch (error) {
      logger.error(`Error in sendMessage:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send WhatsApp message directly (no rate limit check)
   * Used internally by queue processor and when rate limit already checked
   */
  private async sendMessageDirect(organizationId: string, message: OutgoingMessage): Promise<MessageResponse> {
    try {
      // Ensure clients are initialized
      await this.ensureInitialized();
      
      const client = this.clients.get(organizationId);
      if (!client) {
        throw new Error(`WhatsApp client not found for organization ${organizationId}`);
      }

      const startTime = Date.now();

      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${client.credentials.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          ...message
        },
        {
          headers: {
            'Authorization': `Bearer ${client.credentials.accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );

      const duration = Date.now() - startTime;
      const messageId = response.data?.messages?.[0]?.id;
      
      // Log outgoing message
      await this.logMessage({ ...message as any, organizationId }, 'OUTBOUND', messageId);
      
      // Track metrics
      await this.trackMessageMetrics(organizationId, 'sent', duration);

      logger.info('Message sent successfully', {
        organizationId,
        messageId,
        duration: `${duration}ms`
      });

      return {
        success: true,
        messageId
      };

    } catch (error) {
      await this.handleWhatsAppError(error as AxiosError, organizationId, 'sendMessage');
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Log WhatsApp message to database
   */
  private async logMessage(message: IncomingMessage | (OutgoingMessage & { organizationId: string }), direction: 'INBOUND' | 'OUTBOUND', messageId?: string): Promise<void> {
    try {
      const prisma = getPrismaClient();
      
      // Get patient ID, but allow null if patient doesn't exist
      const patientId = await this.getPatientIdByPhone(
        (message as any).organizationId!, 
        direction === 'INBOUND' ? (message as IncomingMessage).from : (message as OutgoingMessage).to
      );
      
      // Handle different message structures for incoming vs outgoing
      let messageType: string;
      let content: string;
      
      if (direction === 'INBOUND') {
        const incomingMsg = message as IncomingMessage;
        messageType = incomingMsg.message.type.toUpperCase();
        content = incomingMsg.message.text?.body || JSON.stringify(incomingMsg.message);
      } else {
        const outgoingMsg = message as OutgoingMessage;
        messageType = outgoingMsg.type.toUpperCase();
        content = outgoingMsg.text?.body || JSON.stringify(outgoingMsg);
      }
      
      // Build message data with optional patientId
      const messageData: any = {
        id: uuidv4(),
        messageType: messageType as any,
        content: content,
        direction: direction as any,
        status: 'SENT',
        organizationId: (message as any).organizationId!,
        language: 'en',
        ...(messageId && { whatsappMessageId: messageId }),
        ...(patientId && { patientId }) // Only add patientId if it exists
      };
      
      await prisma.whatsAppMessage.create({ data: messageData });
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
          status: 'active'
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
   * Handle WhatsApp API errors
   */
  private async handleWhatsAppError(error: AxiosError, organizationId: string, context: string): Promise<void> {
    const status = error.response?.status;
    const errorData = error.response?.data as any;

    logger.error(`WhatsApp API error in ${context}`, {
      organizationId,
      status,
      errorCode: errorData?.error?.code,
      errorMessage: errorData?.error?.message,
      errorType: errorData?.error?.type,
      errorDetails: errorData?.error?.error_data,
      fullResponse: JSON.stringify(errorData),
      context
    });

    // Handle specific error types
    if (status === 429) {
      logger.warn('Rate limit hit, messages will be queued');
      await this.trackMessageMetrics(organizationId, 'rate_limited', 0);
    } else if (status === 401) {
      logger.error('Authentication failed - access token may be expired');
      // TODO: Implement token refresh or notify admin
    } else if (status && status >= 500) {
      logger.error('WhatsApp API server error - will retry');
    }
  }

  /**
   * Track message metrics in Redis
   */
  private async trackMessageMetrics(organizationId: string, metricType: string, duration: number): Promise<void> {
    try {
      const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Increment message count by type
      await this.redis.hincrby(`metrics:messages:${organizationId}:${date}`, metricType, 1);
      
      // Track response time (if applicable)
      if (duration > 0) {
        await this.redis.zadd(`metrics:response_times:${organizationId}`, Date.now(), duration);
        
        // Keep only last 1000 response times
        await this.redis.zremrangebyrank(`metrics:response_times:${organizationId}`, 0, -1001);
      }
    } catch (error) {
      logger.error('Error tracking metrics:', error);
      // Don't throw - metrics failure shouldn't break message flow
    }
  }

  /**
   * Get message metrics for organization
   */
  async getMessageMetrics(organizationId: string, date?: string): Promise<any> {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const metrics = await this.redis.hgetall(`metrics:messages:${organizationId}:${targetDate}`);
      
      // Get response time statistics
      const responseTimes = await this.redis.zrange(`metrics:response_times:${organizationId}`, 0, -1);
      const times = responseTimes.map(Number);
      
      return {
        date: targetDate,
        messagesSent: parseInt(metrics.sent || '0'),
        messagesReceived: parseInt(metrics.received || '0'),
        messagesRateLimited: parseInt(metrics.rate_limited || '0'),
        averageResponseTime: times.length > 0 ? times.reduce((a: number, b: number) => a + b, 0) / times.length : 0,
        responseTimes: {
          count: times.length,
          min: times.length > 0 ? Math.min(...times) : 0,
          max: times.length > 0 ? Math.max(...times) : 0,
        }
      };
    } catch (error) {
      logger.error('Error getting message metrics:', error);
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
