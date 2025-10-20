/**
 * Book Appointment Handler - TASK-041
 * 
 * Multi-step conversation handler for booking appointments via WhatsApp.
 * Writes directly to Google Sheets as primary data store.
 * 
 * State Machine Flow:
 * 1. START → Show doctors list
 * 2. AWAITING_PROVIDER_SELECTION → Show available dates
 * 3. AWAITING_DATE_SELECTION → Show time slots
 * 4. AWAITING_TIME_SLOT_SELECTION → Show confirmation
 * 5. AWAITING_CONFIRMATION → Book to Google Sheets → COMPLETED
 * 
 * Features:
 * - Bilingual support (English/Urdu)
 * - Google Sheets integration
 * - Patient identification/creation
 * - Slot conflict prevention
 * - Conversation state persistence
 * 
 * @version 1.0
 * @date October 20, 2025
 */

import { BaseIntentHandler, IntentHandlerContext, IntentHandlerResult } from './BaseIntentHandler';
import { Intent } from '../intentRecognitionService';
import messageTemplates from '../messageTemplates';
import googleSheetsService from '../googleSheetsService';
import slotLockingService from '../slotLockingService';
import getPrismaClient from '../prisma';
import logger from '../../utils/logger';

// Booking flow steps
enum BookingStep {
  START = 'start',
  AWAITING_FAMILY_MEMBER_SELECTION = 'awaiting_family_member_selection', // NEW: Family account support
  AWAITING_PROVIDER_SELECTION = 'awaiting_provider_selection',
  AWAITING_DATE_SELECTION = 'awaiting_date_selection',
  AWAITING_TIME_SLOT_SELECTION = 'awaiting_time_slot_selection',
  AWAITING_CONFIRMATION = 'awaiting_confirmation',
  COMPLETED = 'completed',
}

// State data is stored in BaseIntentHandler's updateStateData method
// No interface needed as it's dynamically handled

export class BookAppointmentHandler extends BaseIntentHandler {
  constructor() {
    super(Intent.BOOK_APPOINTMENT);
  }

  public async handle(context: IntentHandlerContext): Promise<IntentHandlerResult> {
    this.validateContext(context);

    try {
      // Determine current step in booking flow
      const currentStep = context.conversationState?.step || BookingStep.START;
      
      logger.info(`[BookAppointmentHandler] Processing step: ${currentStep}`, {
        organizationId: context.organizationId,
        phoneNumber: context.phoneNumber,
      });

      // Route to appropriate step handler
      switch (currentStep) {
        case BookingStep.START:
          return await this.handleStart(context);
        
        case BookingStep.AWAITING_FAMILY_MEMBER_SELECTION:
          return await this.handleFamilyMemberSelection(context);
        
        case BookingStep.AWAITING_PROVIDER_SELECTION:
          return await this.handleProviderSelection(context);
        
        case BookingStep.AWAITING_DATE_SELECTION:
          return await this.handleDateSelection(context);
        
        case BookingStep.AWAITING_TIME_SLOT_SELECTION:
          return await this.handleTimeSlotSelection(context);
        
        case BookingStep.AWAITING_CONFIRMATION:
          return await this.handleConfirmation(context);
        
        default:
          return this.error(
            messageTemplates.get(messageTemplates.ERROR_GENERIC, context.language),
            `Unknown booking step: ${currentStep}`
          );
      }
    } catch (error: any) {
      logger.error('[BookAppointmentHandler] Error processing booking', {
        error: error.message,
        stack: error.stack,
        organizationId: context.organizationId,
      });

      return this.error(
        messageTemplates.get(messageTemplates.ERROR_BOOKING_FAILED, context.language),
        error.message
      );
    }
  }

  /**
   * Step 1: Check for family members, show list if multiple
   */
  private async handleStart(context: IntentHandlerContext): Promise<IntentHandlerResult> {
    // Check for family members (multiple patients with same phone)
    const prisma = getPrismaClient();
    const familyMembers = await prisma.patient.findMany({
      where: {
        organizationId: context.organizationId,
        phone: context.phoneNumber,
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
      },
    });

    // If multiple family members, ask user to select
    if (familyMembers.length > 1) {
      const memberList = familyMembers
        .map((member, index) => {
          const age = member.dateOfBirth
            ? Math.floor((Date.now() - member.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
            : null;
          const ageStr = age ? ` (${age} years)` : '';
          return `${index + 1}️⃣ ${member.firstName} ${member.lastName}${ageStr}`;
        })
        .join('\n');

      const addNewOption = `${familyMembers.length + 1}️⃣ ${context.language === 'en' ? 'Add New Family Member' : 'نیا فیملی ممبر شامل کریں'}`;

      const message = context.language === 'en'
        ? `*Select Family Member* 👨‍👩‍👧‍👦\n\n${memberList}\n${addNewOption}\n\nReply with the number.`
        : `*فیملی ممبر منتخب کریں* 👨‍👩‍👧‍👦\n\n${memberList}\n${addNewOption}\n\nنمبر کے ساتھ جواب دیں۔`;

      return this.success(message, {
        nextStep: BookingStep.AWAITING_FAMILY_MEMBER_SELECTION,
        requiresInput: true,
        conversationState: this.updateStateData({
          familyMembers,
        }),
      });
    }

    // Single patient or no patient - proceed to provider selection
    // Store patient ID if exists
    const selectedPatientId = familyMembers.length === 1 ? familyMembers[0]!.id : undefined;

    return await this.showProviderList(context, selectedPatientId);
  }

  /**
   * Step 1a: Handle family member selection
   */
  private async handleFamilyMemberSelection(context: IntentHandlerContext): Promise<IntentHandlerResult> {
    const familyMembers: any[] = this.getStateData(context, 'familyMembers', []);
    const selection = this.parseSelection(context.messageText);

    if (selection === null || selection < 1 || selection > familyMembers.length + 1) {
      return this.error(
        messageTemplates.get(messageTemplates.INVALID_SELECTION, context.language)
      );
    }

    // Check if user wants to add new family member
    if (selection === familyMembers.length + 1) {
      // TODO: Implement new family member registration flow
      const message = context.language === 'en'
        ? 'Adding new family members will be available soon. For now, please contact the clinic directly.'
        : 'نئے فیملی ممبر شامل کرنا جلد دستیاب ہوگا۔ فی الحال براہ کرم کلینک سے براہ راست رابطہ کریں۔';
      
      return this.error(message);
    }

    // User selected an existing family member
    const selectedMember = familyMembers[selection - 1];
    
    logger.info('[BookAppointmentHandler] Family member selected', {
      patientId: selectedMember.id,
      patientName: `${selectedMember.firstName} ${selectedMember.lastName}`,
      phoneNumber: context.phoneNumber,
    });

    // Proceed to provider selection
    return await this.showProviderList(context, selectedMember.id);
  }

  /**
   * Step 2: Show list of available doctors
   */
  private async showProviderList(context: IntentHandlerContext, selectedPatientId?: string): Promise<IntentHandlerResult> {
    // Fetch providers from Google Sheets
    const providers = await this.getProvidersFromGoogleSheets(context.organizationId);

    if (!providers || providers.length === 0) {
      return this.error(
        messageTemplates.get(messageTemplates.NO_PROVIDERS_AVAILABLE, context.language)
      );
    }

    // Format provider list
    const providerList = providers
      .map((provider, index) => {
        const specialization = provider.specialization || '';
        const fee = provider.consultationFee ? ` - Rs. ${provider.consultationFee}` : '';
        return `${index + 1}️⃣ Dr. ${provider.firstName} ${provider.lastName} (${specialization})${fee}`;
      })
      .join('\n');

    const message = messageTemplates.format(messageTemplates.SELECT_PROVIDER, context.language, {
      providerList,
    });

    // Save providers and selected patient to state for next step
    return this.success(message, {
      nextStep: BookingStep.AWAITING_PROVIDER_SELECTION,
      requiresInput: true,
      conversationState: this.updateStateData({
        availableProviders: providers,
        selectedPatientId, // Store selected patient ID
      }),
    });
  }

  /**
   * Step 3: Handle provider selection and show available dates
   */
  private async handleProviderSelection(context: IntentHandlerContext): Promise<IntentHandlerResult> {
    const providers: any[] = this.getStateData(context, 'availableProviders', []);
    
    // Parse user selection
    const selection = this.parseSelection(context.messageText);
    
    if (selection === null || selection < 1 || selection > providers.length) {
      return this.error(
        messageTemplates.get(messageTemplates.INVALID_SELECTION, context.language)
      );
    }

    const selectedProvider = providers[selection - 1];
    
    // Get available dates (next 7 days)
    const availableDates = this.getAvailableDates(7);
    
    const dateList = availableDates
      .map((date, index) => `${index + 1}️⃣ ${this.formatDate(date, context.language)}`)
      .join('\n');

    const message = messageTemplates.format(messageTemplates.SELECT_DATE, context.language, {
      dateList,
    });

    return this.success(message, {
      nextStep: BookingStep.AWAITING_DATE_SELECTION,
      requiresInput: true,
      conversationState: this.updateStateData({
        providerId: selectedProvider.id,
        providerName: `${selectedProvider.firstName} ${selectedProvider.lastName}`,
        availableDates,
        availableProviders: providers, // Keep providers in state
      }),
    });
  }

  /**
   * Step 3: Handle date selection and show available time slots
   */
  private async handleDateSelection(context: IntentHandlerContext): Promise<IntentHandlerResult> {
    const availableDates: string[] = this.getStateData(context, 'availableDates', []);
    const providerId: string = this.getStateData(context, 'providerId');
    const providerName: string = this.getStateData(context, 'providerName');
    
    // Parse user selection
    const selection = this.parseSelection(context.messageText);
    
    if (selection === null || selection < 1 || selection > availableDates.length) {
      return this.error(
        messageTemplates.get(messageTemplates.INVALID_SELECTION, context.language)
      );
    }

    const selectedDate = availableDates[selection - 1]!;
    
    // Get available time slots for the selected date
    const timeSlots = await this.getAvailableTimeSlots(
      context.organizationId,
      providerId,
      selectedDate
    );
    
    if (!timeSlots || timeSlots.length === 0) {
      return this.error(
        messageTemplates.get(messageTemplates.NO_SLOTS_AVAILABLE, context.language)
      );
    }

    const timeSlotList = timeSlots
      .map((slot, index) => `${index + 1}️⃣ ${slot.time}`)
      .join('\n');

    const message = messageTemplates.format(messageTemplates.SELECT_TIME_SLOT, context.language, {
      date: this.formatDate(selectedDate!, context.language),
      providerName,
      timeSlots: timeSlotList,
    });

    return this.success(message, {
      nextStep: BookingStep.AWAITING_TIME_SLOT_SELECTION,
      requiresInput: true,
      conversationState: this.updateStateData({
        selectedDate,
        availableTimeSlots: timeSlots,
        providerId,
        providerName,
        availableDates,
      }),
    });
  }

  /**
   * Step 4: Handle time slot selection and show confirmation
   * ACQUIRES SLOT LOCK to prevent double-booking
   */
  private async handleTimeSlotSelection(context: IntentHandlerContext): Promise<IntentHandlerResult> {
    const timeSlots: any[] = this.getStateData(context, 'availableTimeSlots', []);
    const selectedDate: string = this.getStateData(context, 'selectedDate');
    const providerName: string = this.getStateData(context, 'providerName');
    const providerId: string = this.getStateData(context, 'providerId');
    
    // Parse user selection
    const selection = this.parseSelection(context.messageText);
    
    if (selection === null || selection < 1 || selection > timeSlots.length) {
      return this.error(
        messageTemplates.get(messageTemplates.INVALID_SELECTION, context.language)
      );
    }

    const selectedTimeSlot = timeSlots[selection - 1];
    
    // CRITICAL: Acquire slot lock BEFORE showing confirmation
    logger.info('[BookAppointmentHandler] Attempting to lock slot', {
      organizationId: context.organizationId,
      providerId,
      date: selectedDate,
      time: selectedTimeSlot.time,
      phoneNumber: context.phoneNumber,
    });

    const lockResult = await slotLockingService.acquireSlotLock({
      organizationId: context.organizationId,
      providerId,
      date: selectedDate,
      time: selectedTimeSlot.time,
      phoneNumber: context.phoneNumber,
    });

    if (!lockResult.success) {
      // Slot is locked by another user
      const errorMessage = context.language === 'en'
        ? `⚠️ This slot is currently being booked by another user. ${lockResult.message || 'Please select a different time slot.'}`
        : `⚠️ یہ سلاٹ اس وقت کسی اور صارف کے ذریعہ بک کیا جا رہا ہے۔ براہ کرم ایک مختلف وقت کی سلاٹ منتخب کریں۔`;

      return this.error(errorMessage);
    }

    logger.info('[BookAppointmentHandler] Slot locked successfully', {
      lockToken: lockResult.lockToken?.substring(0, 8) + '...',
      expiresAt: lockResult.expiresAt,
    });
    
    // Show confirmation message
    const message = messageTemplates.format(messageTemplates.BOOKING_CONFIRMATION, context.language, {
      providerName,
      date: this.formatDate(selectedDate, context.language),
      time: selectedTimeSlot.time,
      clinicName: context.organization.name,
    });

    return this.success(message, {
      nextStep: BookingStep.AWAITING_CONFIRMATION,
      requiresInput: true,
      conversationState: this.updateStateData({
        selectedTimeSlot: selectedTimeSlot.time,
        selectedDate,
        providerId,
        providerName,
        lockToken: lockResult.lockToken, // Save lock token for release
      }),
    });
  }

  /**
   * Step 5: Handle confirmation and write to Google Sheets
   * RELEASES SLOT LOCK after booking or cancellation
   */
  private async handleConfirmation(context: IntentHandlerContext): Promise<IntentHandlerResult> {
    const userResponse = context.messageText.toLowerCase().trim();
    
    // Get booking details from state (needed for lock release)
    const providerId: string = this.getStateData(context, 'providerId');
    const providerName: string = this.getStateData(context, 'providerName');
    const selectedDate: string = this.getStateData(context, 'selectedDate');
    const selectedTimeSlot: string = this.getStateData(context, 'selectedTimeSlot');
    const lockToken: string | undefined = this.getStateData(context, 'lockToken');
    
    // Check for confirmation
    const confirmKeywords = ['yes', 'ہاں', 'han', 'confirm', 'ok', 'okay', '1'];
    const isConfirmed = confirmKeywords.some(keyword => userResponse.includes(keyword));
    
    if (!isConfirmed) {
      // Release lock on cancellation
      if (lockToken) {
        await slotLockingService.releaseSlotLock({
          organizationId: context.organizationId,
          providerId,
          date: selectedDate,
          time: selectedTimeSlot,
          phoneNumber: context.phoneNumber,
          lockToken,
        });
        logger.info('[BookAppointmentHandler] Lock released on booking cancellation');
      }

      return this.success(
        messageTemplates.get(messageTemplates.BOOKING_CANCELLED, context.language),
        {
          nextStep: BookingStep.COMPLETED,
        }
      );
    }

    // Get patient (from family selection or create new)
    const selectedPatientId = this.getStateData(context, 'selectedPatientId');
    let patient;
    
    if (selectedPatientId) {
      // Family member was selected
      const prisma = getPrismaClient();
      patient = await prisma.patient.findUnique({
        where: { id: selectedPatientId },
      });
      
      if (!patient) {
        throw new Error('Selected patient not found');
      }
    } else {
      // No family member selected, ensure patient exists or create
      patient = context.patient || await this.ensurePatientExists(context);
    }

    try {
      // Write appointment to Google Sheets (PRIMARY)
      const appointmentId = await this.writeAppointmentToGoogleSheets(
        context.organizationId,
        {
          patientId: patient.id,
          providerId,
          scheduledAt: this.parseDateTime(selectedDate, selectedTimeSlot),
          duration: 30, // Default 30 minutes
          status: 'SCHEDULED',
          bookingSource: 'WHATSAPP',
          organizationId: context.organizationId,
        }
      );

      logger.info('[BookAppointmentHandler] Appointment booked successfully', {
        appointmentId,
        organizationId: context.organizationId,
        phoneNumber: context.phoneNumber,
      });

      // RELEASE LOCK after successful booking
      if (lockToken) {
        await slotLockingService.releaseSlotLock({
          organizationId: context.organizationId,
          providerId,
          date: selectedDate,
          time: selectedTimeSlot,
          phoneNumber: context.phoneNumber,
          lockToken,
        });
        logger.info('[BookAppointmentHandler] Lock released after successful booking');
      }

      // Send confirmation message
      const message = messageTemplates.format(messageTemplates.APPOINTMENT_CONFIRMED, context.language, {
        patientName: `${patient.firstName} ${patient.lastName}`,
        providerName,
        date: this.formatDate(selectedDate, context.language),
        time: selectedTimeSlot,
        clinicName: context.organization.name,
      });

      return this.success(message, {
        nextStep: BookingStep.COMPLETED,
        requiresInput: false,
        metadata: {
          appointmentId,
        },
      });
    } catch (error: any) {
      // RELEASE LOCK on booking failure
      if (lockToken) {
        await slotLockingService.releaseSlotLock({
          organizationId: context.organizationId,
          providerId,
          date: selectedDate,
          time: selectedTimeSlot,
          phoneNumber: context.phoneNumber,
          lockToken,
        });
        logger.warn('[BookAppointmentHandler] Lock released after booking failure');
      }

      // Re-throw error to be caught by outer try-catch
      throw error;
    }
  }

  // ===== HELPER METHODS =====

  /**
   * Get providers from Google Sheets
   */
  private async getProvidersFromGoogleSheets(organizationId: string): Promise<any[]> {
    // For now, fetch from PostgreSQL (Google Sheets integration to be enhanced)
    const prisma = getPrismaClient();
    const providers = await prisma.provider.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        title: true,
        specialization: true,
        consultationDuration: true,
        consultationFee: true,
      },
      take: 10,
    });

    return providers;
  }

  /**
   * Get available dates (next N days, excluding past dates)
   */
  private getAvailableDates(days: number): string[] {
    const dates: string[] = [];
    const today = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]!); // YYYY-MM-DD format
    }
    
    return dates;
  }

  /**
   * Get available time slots for a provider on a specific date
   */
  private async getAvailableTimeSlots(
    _organizationId: string,
    _providerId: string,
    _date: string
  ): Promise<any[]> {
    // Generate time slots (9 AM - 5 PM, 30-minute intervals)
    const slots = [];
    const startHour = 9;
    const endHour = 17;
    
    for (let hour = startHour; hour < endHour; hour++) {
      slots.push({ time: `${hour.toString().padStart(2, '0')}:00` });
      slots.push({ time: `${hour.toString().padStart(2, '0')}:30` });
    }
    
    // TODO: Filter out already booked slots from Google Sheets
    // For now, return all slots
    return slots;
  }

  /**
   * Write appointment to Google Sheets (PRIMARY data store)
   * Then sync to PostgreSQL as cache
   */
  private async writeAppointmentToGoogleSheets(
    organizationId: string,
    appointmentData: any
  ): Promise<string> {
    try {
      // STEP 1: Write to Google Sheets FIRST (PRIMARY)
      const sheetsResult = await googleSheetsService.createAppointment({
        organizationId,
        patientId: appointmentData.patientId,
        providerId: appointmentData.providerId,
        scheduledAt: appointmentData.scheduledAt,
        duration: appointmentData.duration,
        status: appointmentData.status,
        bookingSource: appointmentData.bookingSource,
        title: 'WhatsApp Booking',
      });

      if (!sheetsResult.success || !sheetsResult.appointmentId) {
        throw new Error(sheetsResult.message || 'Failed to write to Google Sheets');
      }

      logger.info('[BookAppointmentHandler] Appointment written to Google Sheets', {
        appointmentId: sheetsResult.appointmentId,
        organizationId,
      });

      // STEP 2: Sync to PostgreSQL (SECONDARY - async cache)
      // This can fail without blocking the booking
      try {
        const prisma = getPrismaClient();
        const scheduledAt = new Date(appointmentData.scheduledAt);
        const endTime = new Date(scheduledAt.getTime() + appointmentData.duration * 60000);
        
        await prisma.appointment.create({
          data: {
            id: sheetsResult.appointmentId, // Use same ID from Sheets
            patientId: appointmentData.patientId,
            providerId: appointmentData.providerId,
            organizationId,
            scheduledAt: appointmentData.scheduledAt,
            endTime, // Add required endTime field
            duration: appointmentData.duration,
            status: appointmentData.status,
            bookingSource: appointmentData.bookingSource,
            title: 'WhatsApp Booking',
          },
        });

        logger.info('[BookAppointmentHandler] Appointment synced to PostgreSQL cache', {
          appointmentId: sheetsResult.appointmentId,
        });
      } catch (syncError: any) {
        // Log sync failure but don't fail the booking
        logger.warn('[BookAppointmentHandler] PostgreSQL sync failed (non-critical)', {
          appointmentId: sheetsResult.appointmentId,
          error: syncError.message,
        });
      }

      return sheetsResult.appointmentId;
    } catch (error: any) {
      logger.error('[BookAppointmentHandler] Failed to write appointment', {
        error: error.message,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Ensure patient exists or create one
   */
  private async ensurePatientExists(context: IntentHandlerContext): Promise<any> {
    const prisma = getPrismaClient();
    
    // Try to find existing patient by phone
    let patient = await prisma.patient.findFirst({
      where: {
        organizationId: context.organizationId,
        phone: context.phoneNumber,
      },
    });

    if (!patient) {
      // Create new patient
      patient = await prisma.patient.create({
        data: {
          organizationId: context.organizationId,
          phone: context.phoneNumber,
          firstName: 'WhatsApp',
          lastName: 'Patient',
          isActive: true,
          registrationSource: 'WHATSAPP',
        },
      });

      logger.info('[BookAppointmentHandler] Created new patient', {
        patientId: patient.id,
        phoneNumber: context.phoneNumber,
      });
    }

    return patient;
  }

  /**
   * Parse user selection (number input)
   */
  private parseSelection(text: string): number | null {
    const match = text.trim().match(/^(\d+)/);
    return match ? parseInt(match[1]!, 10) : null;
  }

  /**
   * Format date for display
   */
  private formatDate(dateStr: string, language: 'en' | 'ur'): string {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    
    if (language === 'ur') {
      return date.toLocaleDateString('ur-PK', options);
    }
    return date.toLocaleDateString('en-US', options);
  }

  /**
   * Parse date and time into Date object
   */
  private parseDateTime(dateStr: string, timeStr: string): Date {
    const parts = timeStr.split(':').map(Number);
    const hours = parts[0]!;
    const minutes = parts[1]!;
    const date = new Date(dateStr);
    date.setHours(hours, minutes, 0, 0);
    return date;
  }
}
