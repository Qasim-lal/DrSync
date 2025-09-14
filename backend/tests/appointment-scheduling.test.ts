/**
 * TASK-019: Appointment Scheduling Logic Integration Tests
 * 
 * Tests the comprehensive appointment scheduling service including:
 * - Time slot management with configurable intervals
 * - Provider schedule integration with working hours parsing
 * - Appointment duration handling with flexible durations  
 * - Advanced scheduling features (availability checking, suggestions, statistics)
 * - Google Sheets primary data source integration
 * - Conflict detection with buffer time
 * - Next available slot finder
 * - Provider schedule management
 * 
 * Status: ✅ Completed (August 30, 2025)
 * Dependencies: TASK-018 (Appointment CRUD operations)
 * 
 * @version 1.0
 * @author DrSync Test Team
 * @date September 12, 2025
 */

import { describe, beforeAll, afterAll, beforeEach, test, expect, jest } from '@jest/globals';
import { createTestOrganization, createTestProvider, cleanupTestData } from '../src/tests/testUtils';
import { getPrismaClient } from '../src/services/prisma';
import { AppointmentService } from '../src/services/appointmentService';

// Mock Google Sheets service
jest.mock('../src/services/googleSheetsService');

const prisma = getPrismaClient();

describe('TASK-019: Appointment Scheduling Logic Integration Tests', () => {
  let testOrgId: string;
  let testProviderId: string;
  let appointmentService: AppointmentService;

  beforeAll(async () => {
    await cleanupTestData();
    
    // Create test organization
    testOrgId = await createTestOrganization({
      name: 'Scheduling Test Clinic',
      subscriptionTier: 'PROFESSIONAL',
      isActive: true
    });

    // Create test provider with comprehensive working hours
    testProviderId = await createTestProvider({
      firstName: 'Dr. Sarah',
      lastName: 'Scheduler',
      specialization: 'General Medicine',
      consultationDuration: 30,
      organizationId: testOrgId,
      workingHours: {
        monday: ['09:00', '12:00', '14:00', '17:00'], // Split schedule with lunch break
        tuesday: ['09:00', '17:00'], // Continuous schedule
        wednesday: ['10:00', '16:00'], // Different start/end time
        thursday: ['09:00', '17:00'],
        friday: ['09:00', '15:00'], // Half day
        saturday: ['10:00', '13:00'], // Weekend morning only
        sunday: [] // Day off
      }
    });

    appointmentService = new AppointmentService();
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Time Slot Generation & Management', () => {
    test('should generate available time slots for continuous working hours', async () => {
      const testDate = new Date('2025-09-16'); // Tuesday (09:00-17:00)
      testDate.setHours(0, 0, 0, 0); // Set to start of day to avoid timezone issues
      
      // Mock empty Google Sheets response - let it fallback to PostgreSQL (which should be empty)
      const mockGetAppointmentsFromGoogleSheets = jest.spyOn(appointmentService as any, 'getAppointmentsFromGoogleSheets');
      mockGetAppointmentsFromGoogleSheets.mockRejectedValue(new Error('Google Sheets fallback test'));

      const availableSlots = await appointmentService.getAvailableSlots({
        providerId: testProviderId,
        organizationId: testOrgId,
        date: testDate,
        duration: 30
      });

      expect(availableSlots.length).toBeGreaterThan(0);
      
      // Check first slot starts at 09:00 (allowing for timezone)
      const firstSlot = availableSlots[0];
      expect(firstSlot).toBeDefined();
      expect(firstSlot!.start.getHours()).toBe(9);
      expect(firstSlot!.start.getMinutes()).toBe(0);
      
      // Check slots are 30 minutes apart
      const secondSlot = availableSlots[1];
      expect(secondSlot).toBeDefined();
      expect(secondSlot!.start.getTime() - firstSlot!.start.getTime()).toBe(30 * 60 * 1000);
      
      // All slots should be available (no conflicts)
      const availableSlotCount = availableSlots.filter(slot => slot.isAvailable).length;
      expect(availableSlotCount).toBeGreaterThan(5); // At least 5 slots in continuous working day
    });

    test('should handle split working hours with lunch break (verifying Monday schedule)', async () => {
      const testDate = new Date('2025-09-15'); // Monday - has split schedule 09:00-12:00, 14:00-17:00
      testDate.setHours(0, 0, 0, 0);
      
      const mockGetAppointmentsFromGoogleSheets = jest.spyOn(appointmentService as any, 'getAppointmentsFromGoogleSheets');
      mockGetAppointmentsFromGoogleSheets.mockRejectedValue(new Error('Google Sheets fallback test'));
      
      const mockPrismaFindMany = jest.spyOn(prisma.appointment, 'findMany');
      mockPrismaFindMany.mockResolvedValue([]);

      const availableSlots = await appointmentService.getAvailableSlots({
        providerId: testProviderId,
        organizationId: testOrgId,
        date: testDate,
        duration: 30
      });

      // The test provider has split working hours (09:00-12:00, 14:00-17:00) for Monday
      expect(availableSlots.length).toBeGreaterThan(0);
      
      // Verify we have slots only during working hours (no lunch break slots)
      const morningSlots = availableSlots.filter(slot => 
        slot.start.getHours() >= 9 && slot.start.getHours() < 12
      );
      const afternoonSlots = availableSlots.filter(slot => 
        slot.start.getHours() >= 14 && slot.start.getHours() < 17
      );
      const lunchSlots = availableSlots.filter(slot => 
        slot.start.getHours() >= 12 && slot.start.getHours() < 14
      );

      expect(morningSlots.length).toBe(6); // 3 hours * 2 slots per hour
      expect(afternoonSlots.length).toBe(6); // 3 hours * 2 slots per hour  
      expect(lunchSlots.length).toBe(0); // No slots during lunch break (12:00-14:00)
    });

    test('should return empty slots for non-working days', async () => {
      const testDate = new Date('2025-09-21'); // Sunday (no working hours)
      
      const availableSlots = await appointmentService.getAvailableSlots({
        providerId: testProviderId,
        organizationId: testOrgId,
        date: testDate,
        duration: 30
      });

      expect(availableSlots).toHaveLength(0);
    });

    test('should handle different appointment durations', async () => {
      const testDate = new Date('2025-09-16'); // Tuesday
      testDate.setHours(0, 0, 0, 0);
      
      const mockGetAppointmentsFromGoogleSheets = jest.spyOn(appointmentService as any, 'getAppointmentsFromGoogleSheets');
      mockGetAppointmentsFromGoogleSheets.mockRejectedValue(new Error('Google Sheets fallback test'));

      // Test 15-minute appointments
      const shortSlots = await appointmentService.getAvailableSlots({
        providerId: testProviderId,
        organizationId: testOrgId,
        date: testDate,
        duration: 15
      });

      // Test 60-minute appointments
      const longSlots = await appointmentService.getAvailableSlots({
        providerId: testProviderId,
        organizationId: testOrgId,
        date: testDate,
        duration: 60
      });

      // Should have more 15-minute slots than 60-minute slots
      expect(shortSlots.length).toBeGreaterThan(longSlots.length);
      
      // Verify duration is correctly applied
      const firstShortSlot = shortSlots[0];
      expect(firstShortSlot).toBeDefined();
      expect(firstShortSlot!.end.getTime() - firstShortSlot!.start.getTime()).toBe(15 * 60 * 1000);
      
      const firstLongSlot = longSlots[0];
      expect(firstLongSlot).toBeDefined();
      expect(firstLongSlot!.end.getTime() - firstLongSlot!.start.getTime()).toBe(60 * 60 * 1000);
    });
  });

  describe('2. Conflict Detection & Resolution', () => {
    test('should detect conflicts with existing appointments', async () => {
      const testDate = new Date('2025-09-16'); // Tuesday
      testDate.setHours(0, 0, 0, 0);
      const conflictTime = new Date(testDate);
      conflictTime.setHours(10, 0, 0, 0); // 10:00 AM
      const conflictEndTime = new Date(conflictTime.getTime() + 30 * 60 * 1000); // 10:30 AM

      // Mock existing appointment at 10:00-10:30
      const mockGetAppointmentsFromGoogleSheets = jest.spyOn(appointmentService as any, 'getAppointmentsFromGoogleSheets');
      mockGetAppointmentsFromGoogleSheets.mockResolvedValue([{
        id: 'existing-appointment',
        scheduledAt: conflictTime,
        endTime: conflictEndTime,
        duration: 30,
        status: 'SCHEDULED'
      }]);

      const availableSlots = await appointmentService.getAvailableSlots({
        providerId: testProviderId,
        organizationId: testOrgId,
        date: testDate,
        duration: 30
      });

      // Find the slot that should be conflicted
      const conflictedSlot = availableSlots.find(slot => 
        slot.start.getHours() === 10 && slot.start.getMinutes() === 0
      );

      expect(conflictedSlot).toBeDefined();
      expect(conflictedSlot!.isAvailable).toBe(false);
      expect(conflictedSlot!.conflictingAppointment).toBeDefined();
    });

    test('should respect buffer time between appointments', async () => {
      const testDate = new Date('2025-09-16'); // Tuesday
      testDate.setHours(0, 0, 0, 0);
      const existingAppointmentTime = new Date(testDate);
      existingAppointmentTime.setHours(10, 0, 0, 0); // 10:00-10:30
      const existingAppointmentEndTime = new Date(existingAppointmentTime.getTime() + 30 * 60 * 1000);

      const mockGetAppointmentsFromGoogleSheets = jest.spyOn(appointmentService as any, 'getAppointmentsFromGoogleSheets');
      mockGetAppointmentsFromGoogleSheets.mockResolvedValue([{
        id: 'existing-appointment',
        scheduledAt: existingAppointmentTime,
        endTime: existingAppointmentEndTime,
        duration: 30,
        status: 'SCHEDULED'
      }]);

      const availableSlots = await appointmentService.getAvailableSlots({
        providerId: testProviderId,
        organizationId: testOrgId,
        date: testDate,
        duration: 30
      }, {
        bufferTime: 15 // 15 minutes buffer
      });

      // The 10:30 slot should also be unavailable due to buffer time
      const bufferedSlot = availableSlots.find(slot => 
        slot.start.getHours() === 10 && slot.start.getMinutes() === 30
      );

      expect(bufferedSlot).toBeDefined();
      expect(bufferedSlot!.isAvailable).toBe(false);
    });

    test('should fallback to PostgreSQL when Google Sheets fails', async () => {
      const testDate = new Date('2025-09-16');
      testDate.setHours(0, 0, 0, 0);
      
      // Mock Google Sheets failure
      const mockGetAppointmentsFromGoogleSheets = jest.spyOn(appointmentService as any, 'getAppointmentsFromGoogleSheets');
      mockGetAppointmentsFromGoogleSheets.mockRejectedValue(new Error('Google Sheets unavailable'));

      // The fallback should happen automatically - we just need to verify it works
      // When Google Sheets fails, the service should use PostgreSQL and return slots
      const availableSlots = await appointmentService.getAvailableSlots({
        providerId: testProviderId,
        organizationId: testOrgId,
        date: testDate,
        duration: 30
      });

      // Should have slots because PostgreSQL fallback is working
      expect(availableSlots.length).toBeGreaterThan(0);
      
      // Verify Google Sheets was attempted (and failed)
      expect(mockGetAppointmentsFromGoogleSheets).toHaveBeenCalled();
      
      // Since Google Sheets failed, all available slots should be truly available
      // (no conflicts because no appointments in database for this test)
      const availableSlotCount = availableSlots.filter(slot => slot.isAvailable).length;
      expect(availableSlotCount).toBeGreaterThan(5); // Should have several available slots
    });
  });

  describe('3. Next Available Slot Finder', () => {
    test('should find next available slot within search window', async () => {
      // Mock Google Sheets to fallback to PostgreSQL (empty appointments)
      const mockGetAppointmentsFromGoogleSheets = jest.spyOn(appointmentService as any, 'getAppointmentsFromGoogleSheets');
      mockGetAppointmentsFromGoogleSheets.mockRejectedValue(new Error('Google Sheets fallback test'));
      
      // Mock PostgreSQL to return no appointments 
      const mockPrismaFindMany = jest.spyOn(prisma.appointment, 'findMany');
      mockPrismaFindMany.mockResolvedValue([]);

      const nextSlot = await appointmentService.findNextAvailableSlot(
        testProviderId,
        testOrgId,
        30, // duration
        7   // search 7 days
      );

      expect(nextSlot).not.toBeNull();
      expect(nextSlot!.isAvailable).toBe(true);
      expect(nextSlot!.start.getTime()).toBeGreaterThan(new Date().getTime());
    });

    test('should return null when no slots available in search window', async () => {
      // Create a new provider with no working hours for this test
      const noWorkProviderId = await createTestProvider({
        firstName: 'Dr. No',
        lastName: 'Schedule',
        specialization: 'Test Medicine',
        consultationDuration: 30,
        organizationId: testOrgId,
        workingHours: {
          // No working days - all arrays empty
          monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: []
        }
      });
      
      // Mock appointments call - though it shouldn't matter since no working hours
      const mockGetAppointmentsFromGoogleSheets = jest.spyOn(appointmentService as any, 'getAppointmentsFromGoogleSheets');
      mockGetAppointmentsFromGoogleSheets.mockRejectedValue(new Error('Google Sheets fallback test'));
      
      const mockPrismaFindMany = jest.spyOn(prisma.appointment, 'findMany');
      mockPrismaFindMany.mockResolvedValue([]);

      const nextSlot = await appointmentService.findNextAvailableSlot(
        noWorkProviderId, // Use the provider with no working hours
        testOrgId,
        30,
        7
      );

      expect(nextSlot).toBeNull();
    });

    test('should respect minimum advance notice', async () => {
      const mockGetAppointmentsFromGoogleSheets = jest.spyOn(appointmentService as any, 'getAppointmentsFromGoogleSheets');
      mockGetAppointmentsFromGoogleSheets.mockRejectedValue(new Error('Google Sheets fallback test'));
      
      const mockPrismaFindMany = jest.spyOn(prisma.appointment, 'findMany');
      mockPrismaFindMany.mockResolvedValue([]);

      const nextSlot = await appointmentService.findNextAvailableSlot(
        testProviderId,
        testOrgId,
        30,
        7
      );

      expect(nextSlot).not.toBeNull();
      
      // Should be at least 2 hours from now (default minimum advance notice)
      const twoHoursFromNow = new Date();
      twoHoursFromNow.setHours(twoHoursFromNow.getHours() + 2);
      
      expect(nextSlot!.start.getTime()).toBeGreaterThanOrEqual(twoHoursFromNow.getTime());
    });
  });

  describe('4. Provider Schedule Management', () => {
    test('should get provider schedule for date range', async () => {
      const startDate = new Date('2025-09-15'); // Monday
      const endDate = new Date('2025-09-21');   // Sunday

      const mockAppointments = [
        {
          id: 'appointment-1',
          scheduledAt: new Date('2025-09-16T10:00:00Z'), // Tuesday 10:00
          duration: 30,
          status: 'SCHEDULED',
          patientName: 'John Doe'
        },
        {
          id: 'appointment-2', 
          scheduledAt: new Date('2025-09-17T14:00:00Z'), // Wednesday 14:00
          duration: 45,
          status: 'CONFIRMED',
          patientName: 'Jane Smith'
        }
      ];

      // Mock Google Sheets response
      const mockGetAppointmentsFromGoogleSheets = jest.spyOn(appointmentService as any, 'getAppointmentsFromGoogleSheets');
      mockGetAppointmentsFromGoogleSheets.mockResolvedValue(mockAppointments);

      const schedule = await appointmentService.getProviderSchedule(
        testProviderId,
        testOrgId,
        startDate,
        endDate
      );

      expect(schedule).toHaveLength(2);
      expect(schedule[0].id).toBe('appointment-1');
      expect(schedule[1].id).toBe('appointment-2');
      
      expect(mockGetAppointmentsFromGoogleSheets).toHaveBeenCalledWith(
        testOrgId,
        testProviderId,
        startDate,
        endDate,
        { excludeCancelled: true, includePatientDetails: true }
      );
    });

    test('should fallback to PostgreSQL for schedule retrieval', async () => {
      const startDate = new Date('2025-09-15');
      const endDate = new Date('2025-09-21');

      // Create a real patient and appointment in PostgreSQL for this test
      const testPatient = await prisma.patient.create({
        data: {
          id: 'test-patient-fallback',
          firstName: 'Test',
          lastName: 'Patient',
          phone: '+1234567890',
          email: 'test@example.com',
          organizationId: testOrgId
        }
      });
      
      const scheduledTime = new Date('2025-09-16T10:00:00Z');
      const endTime = new Date(scheduledTime.getTime() + 30 * 60 * 1000); // 30 minutes later
      
      const testAppointment = await prisma.appointment.create({
        data: {
          id: 'pg-appointment-fallback-1',
          providerId: testProviderId,
          organizationId: testOrgId,
          scheduledAt: scheduledTime,
          endTime: endTime,
          duration: 30,
          status: 'SCHEDULED',
          patientId: testPatient.id
        }
      });

      try {
        // Mock Google Sheets failure
        const mockGetAppointmentsFromGoogleSheets = jest.spyOn(appointmentService as any, 'getAppointmentsFromGoogleSheets');
        mockGetAppointmentsFromGoogleSheets.mockRejectedValue(new Error('Google Sheets unavailable'));

        const schedule = await appointmentService.getProviderSchedule(
          testProviderId,
          testOrgId,
          startDate,
          endDate
        );

        expect(schedule).toHaveLength(1);
        expect(schedule[0].id).toBe('pg-appointment-fallback-1');
        
        // Verify Google Sheets was attempted (and failed)
        expect(mockGetAppointmentsFromGoogleSheets).toHaveBeenCalled();
      } finally {
        // Cleanup the test appointment and patient
        await prisma.appointment.delete({
          where: { id: testAppointment.id }
        });
        await prisma.patient.delete({
          where: { id: testPatient.id }
        });
      }
    });
  });

  describe('5. Advanced Scheduling Features', () => {
    test('should handle custom scheduling options', async () => {
      const testDate = new Date('2025-09-20'); // Saturday (working day)
      testDate.setHours(0, 0, 0, 0);
      
      const mockGetAppointmentsFromGoogleSheets = jest.spyOn(appointmentService as any, 'getAppointmentsFromGoogleSheets');
      mockGetAppointmentsFromGoogleSheets.mockRejectedValue(new Error('Google Sheets fallback test'));
      
      const mockPrismaFindMany = jest.spyOn(prisma.appointment, 'findMany');
      mockPrismaFindMany.mockResolvedValue([]);

      const availableSlots = await appointmentService.getAvailableSlots({
        providerId: testProviderId,
        organizationId: testOrgId,
        date: testDate,
        duration: 30
      }, {
        allowWeekends: true,
        minAdvanceNotice: 1, // 1 hour minimum
        maxAdvanceBooking: 30, // 30 days maximum
        bufferTime: 10 // 10 minutes buffer
      });

      expect(availableSlots.length).toBeGreaterThan(0);
      
      // All available slots should respect the custom options
      availableSlots.forEach(slot => {
        if (slot.isAvailable) {
          const oneHourFromNow = new Date();
          oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);
          expect(slot.start.getTime()).toBeGreaterThanOrEqual(oneHourFromNow.getTime());
        }
      });
    });

    test('should reject weekend appointments when not allowed', async () => {
      const testDate = new Date('2025-09-20'); // Saturday
      testDate.setHours(0, 0, 0, 0);
      
      const mockGetAppointmentsFromGoogleSheets = jest.spyOn(appointmentService as any, 'getAppointmentsFromGoogleSheets');
      mockGetAppointmentsFromGoogleSheets.mockRejectedValue(new Error('Google Sheets fallback test'));
      
      const mockPrismaFindMany = jest.spyOn(prisma.appointment, 'findMany');
      mockPrismaFindMany.mockResolvedValue([]);

      const availableSlots = await appointmentService.getAvailableSlots({
        providerId: testProviderId,
        organizationId: testOrgId,
        date: testDate,
        duration: 30
      }, {
        allowWeekends: false
      });

      // All Saturday slots should be unavailable due to weekend restriction
      const availableSlotCount = availableSlots.filter(slot => slot.isAvailable).length;
      expect(availableSlotCount).toBe(0);
    });

    test('should enforce maximum advance booking limit', async () => {
      const farFutureDate = new Date();
      farFutureDate.setDate(farFutureDate.getDate() + 100); // 100 days in future
      farFutureDate.setHours(0, 0, 0, 0);
      
      const mockGetAppointmentsFromGoogleSheets = jest.spyOn(appointmentService as any, 'getAppointmentsFromGoogleSheets');
      mockGetAppointmentsFromGoogleSheets.mockRejectedValue(new Error('Google Sheets fallback test'));
      
      const mockPrismaFindMany = jest.spyOn(prisma.appointment, 'findMany');
      mockPrismaFindMany.mockResolvedValue([]);

      const availableSlots = await appointmentService.getAvailableSlots({
        providerId: testProviderId,
        organizationId: testOrgId,
        date: farFutureDate,
        duration: 30
      }, {
        maxAdvanceBooking: 90 // 90 days maximum
      });

      // All slots should be unavailable due to max advance booking limit
      const availableSlotCount = availableSlots.filter(slot => slot.isAvailable).length;
      expect(availableSlotCount).toBe(0);
    });
  });

  describe('6. Error Handling & Edge Cases', () => {
    test('should handle invalid provider gracefully', async () => {
      const invalidProviderId = 'non-existent-provider';
      
      await expect(appointmentService.getAvailableSlots({
        providerId: invalidProviderId,
        organizationId: testOrgId,
        date: new Date(),
        duration: 30
      })).rejects.toThrow('Provider not found or inactive');
    });

    test('should handle malformed working hours', async () => {
      // Create a provider with invalid working hours directly in database
      const malformedProviderId = await createTestProvider({
        firstName: 'Dr. Invalid',
        lastName: 'Hours',
        specialization: 'Test Medicine',
        consultationDuration: 30,
        organizationId: testOrgId,
        workingHours: {
          monday: ['25:00', '26:00'], // Invalid time values - hours > 23
          tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: []
        }
      });

      const mockGetAppointmentsFromGoogleSheets = jest.spyOn(appointmentService as any, 'getAppointmentsFromGoogleSheets');
      mockGetAppointmentsFromGoogleSheets.mockRejectedValue(new Error('Google Sheets fallback test'));

      const availableSlots = await appointmentService.getAvailableSlots({
        providerId: malformedProviderId,
        organizationId: testOrgId,
        date: new Date('2025-09-15'), // Monday
        duration: 30
      });

      // Should return empty array for invalid time values
      expect(availableSlots).toHaveLength(0);
    });

    test('should handle zero or negative duration gracefully', async () => {
      const testDate = new Date('2025-09-16');
      testDate.setHours(0, 0, 0, 0);
      
      const mockGetAppointmentsFromGoogleSheets = jest.spyOn(appointmentService as any, 'getAppointmentsFromGoogleSheets');
      mockGetAppointmentsFromGoogleSheets.mockRejectedValue(new Error('Google Sheets fallback test'));
      
      const mockPrismaFindMany = jest.spyOn(prisma.appointment, 'findMany');
      mockPrismaFindMany.mockResolvedValue([]);

      // Zero duration should return empty slots
      const zeroSlots = await appointmentService.getAvailableSlots({
        providerId: testProviderId,
        organizationId: testOrgId,
        date: testDate,
        duration: 0
      });
      expect(zeroSlots).toHaveLength(0);

      // Negative duration should return empty slots
      const negativeSlots = await appointmentService.getAvailableSlots({
        providerId: testProviderId,
        organizationId: testOrgId,
        date: testDate,
        duration: -15
      });
      expect(negativeSlots).toHaveLength(0);
    });

    test('should handle date in the past', async () => {
      const pastDate = new Date('2023-09-01'); // Past date (definitely in the past)
      pastDate.setHours(0, 0, 0, 0);
      
      const mockGetAppointmentsFromGoogleSheets = jest.spyOn(appointmentService as any, 'getAppointmentsFromGoogleSheets');
      mockGetAppointmentsFromGoogleSheets.mockRejectedValue(new Error('Google Sheets fallback test'));
      
      const mockPrismaFindMany = jest.spyOn(prisma.appointment, 'findMany');
      mockPrismaFindMany.mockResolvedValue([]);

      const availableSlots = await appointmentService.getAvailableSlots({
        providerId: testProviderId,
        organizationId: testOrgId,
        date: pastDate,
        duration: 30
      });

      // All slots should be unavailable due to being in the past
      const availableSlotCount = availableSlots.filter(slot => slot.isAvailable).length;
      expect(availableSlotCount).toBe(0);
    });
  });

  describe('7. Performance & Optimization', () => {
    test('should handle large number of existing appointments efficiently', async () => {
      const testDate = new Date('2025-09-16');
      testDate.setHours(0, 0, 0, 0);
      
      // Mock large number of appointments with proper endTime
      const manyAppointments = Array.from({ length: 100 }, (_, i) => {
        const startTime = new Date(testDate.getTime() + i * 15 * 60 * 1000);
        const endTime = new Date(startTime.getTime() + 15 * 60 * 1000);
        return {
          id: `appointment-${i}`,
          scheduledAt: startTime,
          endTime: endTime,
          duration: 15,
          status: 'SCHEDULED'
        };
      });

      const mockGetAppointmentsFromGoogleSheets = jest.spyOn(appointmentService as any, 'getAppointmentsFromGoogleSheets');
      mockGetAppointmentsFromGoogleSheets.mockResolvedValue(manyAppointments);

      const startTime = Date.now();
      const availableSlots = await appointmentService.getAvailableSlots({
        providerId: testProviderId,
        organizationId: testOrgId,
        date: testDate,
        duration: 30
      });
      const endTime = Date.now();

      // Should complete within reasonable time (< 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);
      expect(availableSlots).toBeDefined();
    });

    test('should handle multiple calls without caching (current behavior)', async () => {
      const testDate = new Date('2025-09-16');
      testDate.setHours(0, 0, 0, 0);
      
      const mockGetAppointmentsFromGoogleSheets = jest.spyOn(appointmentService as any, 'getAppointmentsFromGoogleSheets');
      mockGetAppointmentsFromGoogleSheets.mockRejectedValue(new Error('Google Sheets fallback test'));

      // Make multiple calls to the same provider/date with different durations
      const firstCall = await appointmentService.getAvailableSlots({
        providerId: testProviderId,
        organizationId: testOrgId,
        date: testDate,
        duration: 30
      });

      const secondCall = await appointmentService.getAvailableSlots({
        providerId: testProviderId,
        organizationId: testOrgId,
        date: testDate,
        duration: 45
      });

      // Both calls should succeed and return slots
      expect(firstCall.length).toBeGreaterThan(0);
      expect(secondCall.length).toBeGreaterThan(0);
      
      // 30-minute slots should generally be more numerous than 45-minute slots
      expect(firstCall.length).toBeGreaterThanOrEqual(secondCall.length);
      
      // This test documents current behavior: no caching is implemented
      // Each call fetches provider data fresh from the database
      // When caching is added, this test can be updated to verify caching behavior
    });
  });
});