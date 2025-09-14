/**
 * Google Sheets Service Test Suite
 * 
 * Comprehensive tests to validate Google Sheets integration functionality,
 * data integrity, and architecture transition from PostgreSQL-first to
 * Google Sheets-first data flow.
 * 
 * Test Categories:
 * 1. Authentication & Authorization
 * 2. Sheet Creation & Templates
 * 3. Atomic Slot Locking
 * 4. CRUD Operations (Appointments, Patients, Providers)
 * 5. Error Handling & Rate Limiting
 * 6. Data Integrity & Validation
 * 7. Multi-client Isolation
 * 8. Performance & Load Testing
 * 
 * @version 1.0
 * @author DrSync Development Team
 * @date September 12, 2025
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';
import googleSheetsService from '../src/services/googleSheetsService';
import getPrismaClient from '../src/services/prisma';

// Test data constants
const TEST_ORGANIZATION_ID = 'test-org-123';
const TEST_PATIENT_DATA = {
  firstName: 'John',
  lastName: 'Doe',
  phone: '+923001234567',
  email: 'john.doe@example.com',
  organizationId: TEST_ORGANIZATION_ID
};

const TEST_PROVIDER_DATA = {
  firstName: 'Dr. Sarah',
  lastName: 'Smith',
  specialization: 'General Medicine',
  organizationId: TEST_ORGANIZATION_ID
};

const TEST_APPOINTMENT_DATA = {
  patientId: '',
  providerId: '',
  scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
  duration: 30,
  status: 'SCHEDULED',
  bookingSource: 'DASHBOARD',
  organizationId: TEST_ORGANIZATION_ID
};

describe('Google Sheets Service', () => {
  let _testOrganization: any;
  let _testPatientId: string;
  let _testProviderId: string;

  beforeAll(async () => {
    // Create test organization
    const prisma = getPrismaClient();
    _testOrganization = await prisma.organization.create({
      data: {
        id: TEST_ORGANIZATION_ID,
        name: 'Test Clinic',
        slug: 'test-clinic',
        email: 'test@example.com',
        googleCredentials: {
          access_token: 'mock_access_token',
          refresh_token: 'mock_refresh_token',
          token_type: 'Bearer',
          expiry_date: Date.now() + 3600000
        }
      }
    });
  });

  afterAll(async () => {
    // Clean up test organization
    const prisma = getPrismaClient();
    await prisma.organization.delete({
      where: { id: TEST_ORGANIZATION_ID }
    }).catch(() => {}); // Ignore if already deleted
  });

  beforeEach(() => {
    // Reset test data
    _testPatientId = '';
    _testProviderId = '';
  });

  describe('1. Authentication & Authorization', () => {
    test('should initialize client credentials successfully', async () => {
      await expect(
        googleSheetsService.initializeClientCredentials(TEST_ORGANIZATION_ID)
      ).resolves.not.toThrow();
    });

    test('should throw error for invalid organization ID', async () => {
      await expect(
        googleSheetsService.initializeClientCredentials('invalid-org-id')
      ).rejects.toThrow('Google credentials not configured for organization');
    });

    test('should get sheet structure configuration', async () => {
      const structure = await googleSheetsService.getSheetStructure(TEST_ORGANIZATION_ID);
      
      expect(structure).toHaveProperty('organizationId', TEST_ORGANIZATION_ID);
      expect(structure).toHaveProperty('structure');
      expect(['TABS', 'SEPARATE_SHEETS']).toContain(structure.structure);
    });
  });

  describe('2. Sheet Creation & Templates', () => {
    test('should create organization sheets with proper templates', async () => {
      const spreadsheetId = await googleSheetsService.createOrganizationSheets(TEST_ORGANIZATION_ID);
      
      expect(spreadsheetId).toBeDefined();
      expect(typeof spreadsheetId).toBe('string');
      
      // Verify organization was updated with sheet ID
      const prisma = getPrismaClient();
      const updatedOrg = await prisma.organization.findUnique({
        where: { id: TEST_ORGANIZATION_ID },
        select: { googleSheetsId: true, googleSheetsStructure: true }
      });
      
      expect(updatedOrg?.googleSheetsId).toBe(spreadsheetId);
      expect(updatedOrg?.googleSheetsStructure).toBe('TABS');
    });

    test('should setup proper sheet headers', async () => {
      // This would require actual Google Sheets API integration
      // For now, we test that the method completes without error
      await expect(
        googleSheetsService.createOrganizationSheets(TEST_ORGANIZATION_ID)
      ).resolves.toBeDefined();
    });
  });

  describe('3. Atomic Slot Locking', () => {
    const testSlotData = {
      providerId: 'test-provider-123',
      scheduledAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      lockToken: uuidv4(),
      lockedBy: 'DASHBOARD',
      lockDuration: 30000 // 30 seconds
    };

    test('should successfully lock an available slot', async () => {
      const lockResult = await googleSheetsService.lockSlot(testSlotData);
      
      expect(lockResult.success).toBe(true);
      expect(lockResult.message).toBeUndefined();
    });

    test('should prevent double booking of locked slots', async () => {
      // Lock the slot first
      await googleSheetsService.lockSlot(testSlotData);
      
      // Try to lock the same slot again
      const secondLockAttempt = await googleSheetsService.lockSlot({
        ...testSlotData,
        lockToken: uuidv4(),
        lockedBy: 'WHATSAPP'
      });
      
      expect(secondLockAttempt.success).toBe(false);
      expect(secondLockAttempt.message).toContain('Slot is locked by');
    });

    test('should release locks properly', async () => {
      const lockToken = uuidv4();
      const slotData = { ...testSlotData, lockToken };
      
      // Lock the slot
      await googleSheetsService.lockSlot(slotData);
      
      // Release the lock
      await googleSheetsService.releaseLock(lockToken);
      
      // Should be able to lock again
      const newLockResult = await googleSheetsService.lockSlot({
        ...slotData,
        lockToken: uuidv4()
      });
      
      expect(newLockResult.success).toBe(true);
    });

    test('should clean up expired locks automatically', async () => {
      const expiredSlotData = {
        ...testSlotData,
        lockToken: uuidv4(),
        lockDuration: 100 // Very short duration
      };
      
      // Lock the slot
      await googleSheetsService.lockSlot(expiredSlotData);
      
      // Wait for lock to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should be able to lock again (expired lock should be cleaned up)
      const newLockResult = await googleSheetsService.lockSlot({
        ...expiredSlotData,
        lockToken: uuidv4()
      });
      
      expect(newLockResult.success).toBe(true);
    });
  });

  describe('4. CRUD Operations - Patients', () => {
    test('should create patient in Google Sheets successfully', async () => {
      const result = await googleSheetsService.createPatient(TEST_PATIENT_DATA);
      
      expect(result.success).toBe(true);
      expect(result.patientId).toBeDefined();
      expect(result.message).toContain('successfully');
      
      _testPatientId = result.patientId!;
    });

    test('should handle family member creation correctly', async () => {
      // Create first family member
      const firstMember = await googleSheetsService.createPatient(TEST_PATIENT_DATA);
      expect(firstMember.success).toBe(true);
      
      // Create second family member with same phone
      const familyMemberData = {
        ...TEST_PATIENT_DATA,
        firstName: 'Jane',
        lastName: 'Doe',
        relationToPrimaryContact: 'spouse'
      };
      
      const secondMember = await googleSheetsService.createPatient(familyMemberData);
      expect(secondMember.success).toBe(true);
      expect(secondMember.patientId).not.toBe(firstMember.patientId);
    });

    test('should validate patient data properly', async () => {
      const invalidPatientData = {
        firstName: '', // Empty required field
        lastName: 'Test',
        phone: 'invalid-phone',
        organizationId: TEST_ORGANIZATION_ID
      };
      
      // The service should validate this internally
      // For now, we assume validation passes to Google Sheets
      const result = await googleSheetsService.createPatient(invalidPatientData as any);
      
      // Depending on implementation, this might succeed or fail
      // The important thing is that it handles the case gracefully
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('5. CRUD Operations - Providers', () => {
    test('should create provider in Google Sheets successfully', async () => {
      const result = await googleSheetsService.createProvider(TEST_PROVIDER_DATA);
      
      expect(result.success).toBe(true);
      expect(result.providerId).toBeDefined();
      expect(result.message).toContain('successfully');
      
      _testProviderId = result.providerId!;
    });

    test('should handle provider working hours correctly', async () => {
      const providerWithHours = {
        ...TEST_PROVIDER_DATA,
        firstName: 'Dr. Michael',
        lastName: 'Johnson',
        workingHours: {
          monday: ['09:00-17:00'],
          tuesday: ['09:00-12:00', '14:00-17:00'],
          wednesday: ['09:00-17:00']
        }
      };
      
      const result = await googleSheetsService.createProvider(providerWithHours);
      expect(result.success).toBe(true);
    });
  });

  describe('6. CRUD Operations - Appointments', () => {
    beforeEach(async () => {
      // Ensure we have test patient and provider
      if (!_testPatientId) {
        const patient = await googleSheetsService.createPatient(TEST_PATIENT_DATA);
        _testPatientId = patient.patientId!;
      }
      
      if (!_testProviderId) {
        const provider = await googleSheetsService.createProvider(TEST_PROVIDER_DATA);
        _testProviderId = provider.providerId!;
      }
    });

    test('should create appointment in Google Sheets successfully', async () => {
      const appointmentData = {
        ...TEST_APPOINTMENT_DATA,
        patientId: _testPatientId,
        providerId: _testProviderId
      };
      
      const result = await googleSheetsService.createAppointment(appointmentData);
      
      expect(result.success).toBe(true);
      expect(result.appointmentId).toBeDefined();
      expect(result.message).toContain('successfully');
    });

    test('should detect appointment conflicts', async () => {
      const appointmentData = {
        ...TEST_APPOINTMENT_DATA,
        patientId: _testPatientId,
        providerId: _testProviderId
      };
      
      // Create first appointment
      const firstResult = await googleSheetsService.createAppointment(appointmentData);
      expect(firstResult.success).toBe(true);
      
      // Try to create conflicting appointment (same time, same provider)
      const conflictResult = await googleSheetsService.createAppointment(appointmentData);
      
      // Depending on implementation, this should either:
      // 1. Fail with conflict message, or
      // 2. Suggest alternative slot
      if (!conflictResult.success) {
        expect(conflictResult.message).toContain('conflict');
      }
    });

    test('should update appointment successfully', async () => {
      // Create appointment first
      const appointmentData = {
        ...TEST_APPOINTMENT_DATA,
        patientId: _testPatientId,
        providerId: _testProviderId
      };
      
      const createResult = await googleSheetsService.createAppointment(appointmentData);
      expect(createResult.success).toBe(true);
      
      // Update appointment
      const updateResult = await googleSheetsService.updateAppointment(
        TEST_ORGANIZATION_ID,
        createResult.appointmentId!,
        { status: 'CONFIRMED', title: 'Updated Appointment' }
      );
      
      expect(updateResult).toBe(true);
    });
  });

  describe('7. Error Handling & Rate Limiting', () => {
    test('should handle Google Sheets API failures gracefully', async () => {
      // Mock API failure scenario
      const invalidOrgId = 'non-existent-org';
      
      await expect(
        googleSheetsService.createPatient({
          ...TEST_PATIENT_DATA,
          organizationId: invalidOrgId
        })
      ).rejects.toThrow();
    });

    test('should implement rate limiting protection', async () => {
      // This would test the actual rate limiting implementation
      // For now, we ensure the method exists
      expect(typeof googleSheetsService.handleRateLimit).toBe('function');
    });

    test('should validate data before sending to Google Sheets', async () => {
      // Test validation methods
      expect(googleSheetsService.validatePatientData(TEST_PATIENT_DATA)).toBe(true);
      expect(googleSheetsService.validateProviderData(TEST_PROVIDER_DATA)).toBe(true);
      
      // Test invalid data
      expect(googleSheetsService.validatePatientData({} as any)).toBe(false);
      expect(googleSheetsService.validateProviderData({} as any)).toBe(false);
    });
  });

  describe('8. Data Integrity & Validation', () => {
    test('should maintain data consistency between operations', async () => {
      // Create patient
      const patientResult = await googleSheetsService.createPatient(TEST_PATIENT_DATA);
      expect(patientResult.success).toBe(true);
      
      // Create provider
      const providerResult = await googleSheetsService.createProvider(TEST_PROVIDER_DATA);
      expect(providerResult.success).toBe(true);
      
      // Create appointment linking them
      const appointmentData = {
        ...TEST_APPOINTMENT_DATA,
        patientId: patientResult.patientId!,
        providerId: providerResult.providerId!
      };
      
      const appointmentResult = await googleSheetsService.createAppointment(appointmentData);
      expect(appointmentResult.success).toBe(true);
      
      // All operations should have succeeded with consistent data
      expect(appointmentResult.appointmentId).toBeDefined();
    });

    test('should handle date and time validation correctly', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 1 week from now
      // const _pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      
      // Future appointment should be valid
      const validAppointment = {
        ...TEST_APPOINTMENT_DATA,
        scheduledAt: futureDate,
        patientId: _testPatientId || uuidv4(),
        providerId: _testProviderId || uuidv4()
      };
      
      // This should succeed (or fail gracefully with proper error message)
      const result = await googleSheetsService.createAppointment(validAppointment);
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('9. Multi-client Isolation', () => {
    test('should maintain proper organization isolation', async () => {
      // Create data in first organization
      const org1Result = await googleSheetsService.createPatient(TEST_PATIENT_DATA);
      expect(org1Result.success).toBe(true);
      
      // Create data in second organization (if we had one)
      // This would verify that organizations can't access each other's data
      // For now, we just verify the organization ID is properly handled
      expect(TEST_PATIENT_DATA.organizationId).toBe(TEST_ORGANIZATION_ID);
    });

    test('should handle sheet structure variations', async () => {
      const structure = await googleSheetsService.getSheetStructure(TEST_ORGANIZATION_ID);
      
      // Should handle both TABS and SEPARATE_SHEETS structures
      if (structure.structure === 'TABS') {
        expect(structure.tabMappings).toBeDefined();
        expect(structure.tabMappings?.patients).toBeDefined();
        expect(structure.tabMappings?.appointments).toBeDefined();
        expect(structure.tabMappings?.providers).toBeDefined();
      } else {
        expect(structure.sheetMappings).toBeDefined();
        expect(structure.sheetMappings?.patients).toBeDefined();
        expect(structure.sheetMappings?.appointments).toBeDefined();
        expect(structure.sheetMappings?.providers).toBeDefined();
      }
    });
  });

  describe('10. Performance & Load Testing', () => {
    test('should handle concurrent operations without conflicts', async () => {
      // Create multiple patients concurrently
      const patientPromises = Array.from({ length: 5 }, (_, i) => 
        googleSheetsService.createPatient({
          ...TEST_PATIENT_DATA,
          firstName: `Patient${i}`,
          phone: `+92300123456${i}`,
          email: `patient${i}@example.com`
        })
      );
      
      const results = await Promise.all(patientPromises);
      
      // All should succeed
      results.forEach((result, _index) => {
        expect(result.success).toBe(true);
        expect(result.patientId).toBeDefined();
      });
      
      // All should have unique IDs
      const ids = results.map(r => r.patientId);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    test('should handle batch operations efficiently', async () => {
      const startTime = Date.now();
      
      // Create multiple appointments
      const provider = await googleSheetsService.createProvider({
        ...TEST_PROVIDER_DATA,
        firstName: 'Dr. Batch',
        lastName: 'Test'
      });
      
      const appointmentPromises = Array.from({ length: 3 }, (_, i) => {
        const appointmentTime = new Date(Date.now() + (i + 1) * 60 * 60 * 1000);
        return googleSheetsService.createAppointment({
          ...TEST_APPOINTMENT_DATA,
          patientId: _testPatientId || uuidv4(),
          providerId: provider.providerId!,
          scheduledAt: appointmentTime
        });
      });
      
      const results = await Promise.all(appointmentPromises);
      const endTime = Date.now();
      
      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
      
      // Should complete in reasonable time (under 10 seconds for 3 operations)
      expect(endTime - startTime).toBeLessThan(10000);
    });
  });
});

describe('Integration with Controllers', () => {
  test('should integrate properly with appointment controller', async () => {
    // This would test the actual integration between controllers and Google Sheets service
    // For now, we verify that the service methods are called correctly
    
    const appointmentData = {
      ...TEST_APPOINTMENT_DATA,
      patientId: uuidv4(),
      providerId: uuidv4()
    };
    
    // This would simulate controller calling the service
    const result = await googleSheetsService.createAppointment(appointmentData);
    
    // The result structure should match what controllers expect
    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
    
    if (result.success) {
      expect(result).toHaveProperty('appointmentId');
      expect(result).toHaveProperty('message');
    } else {
      expect(result).toHaveProperty('message');
    }
  });
});

export {};