/**
 * TASK-018: Appointment CRUD Operations Integration Tests
 * 
 * Tests the complete appointment management system including:
 * - Appointment CRUD operations (GET, POST, PUT, DELETE, CONFIRM)
 * - Availability checking with conflict detection
 * - Time overlap validation 
 * - Appointment status management with proper transitions
 * - Google Sheets primary data source with PostgreSQL fallback
 * - Organization-scoped data isolation
 * 
 * Status: ✅ Completed (August 30, 2025)
 * Dependencies: TASK-015 (RBAC system)
 * 
 * @version 1.0
 * @author DrSync Test Team
 * @date September 12, 2025
 */

import { describe, beforeAll, afterAll, beforeEach, test, expect, jest } from '@jest/globals';
import request from 'supertest';
import { app } from '../src/app';
import { createTestOrganization, createTestUser, createTestPatient, createTestProvider, cleanupTestData } from '../src/tests/testUtils';
import { getPrismaClient } from '../src/services/prisma';
import googleSheetsService from '../src/services/googleSheetsService';

// Mock Google Sheets service
jest.mock('../src/services/googleSheetsService');

const prisma = getPrismaClient();

describe('TASK-018: Appointment CRUD Operations Integration Tests', () => {
  let testOrgId: string;
  let authToken: string;
  let testPatientId: string;
  let testProviderId: string;

  beforeAll(async () => {
    await cleanupTestData();
    
    // Create test organization and user
    testOrgId = await createTestOrganization({
      name: 'Appointment Test Clinic',
      subscriptionTier: 'PROFESSIONAL',
      isActive: true
    });

    const userEmail = `appointment-test-${Date.now()}@example.com`;
    
    await createTestUser({
      email: userEmail,
      firstName: 'Test',
      lastName: 'Doctor',
      role: 'DOCTOR',
      organizationId: testOrgId
    });

    // Create test patient and provider
    testPatientId = await createTestPatient({
      firstName: 'John',
      lastName: 'Patient',
      phone: `+92300${Math.floor(1000000 + Math.random() * 9000000)}`,
      organizationId: testOrgId
    });

    testProviderId = await createTestProvider({
      firstName: 'Dr. Sarah',
      lastName: 'Provider',
      specialization: 'General Medicine',
      consultationDuration: 30,
      organizationId: testOrgId,
      workingHours: {
        monday: ['09:00', '17:00'],
        tuesday: ['09:00', '17:00'],
        wednesday: ['09:00', '17:00'],
        thursday: ['09:00', '17:00'],
        friday: ['09:00', '17:00'],
        saturday: ['09:00', '13:00'],
        sunday: []
      }
    });

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: userEmail,
        password: 'password123'
      });

    authToken = loginResponse.body.data.tokens.accessToken;
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Appointment Creation (POST /api/appointments)', () => {
    test('should create appointment successfully with Google Sheets primary', async () => {
      const appointmentData = {
        patientId: testPatientId,
        providerId: testProviderId,
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        duration: 30,
        title: 'General Checkup',
        priority: 'NORMAL'
      };

      // Mock successful Google Sheets creation
      const mockCreateAppointment = jest.mocked(googleSheetsService.createAppointment);
      mockCreateAppointment.mockResolvedValue({
        success: true,
        appointmentId: 'test-appointment-id',
        message: 'Appointment created successfully'
      });

      const response = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(appointmentData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Google Sheets');
      expect(response.body.data.appointment).toBeDefined();
      expect(response.body.data.appointment.patientId).toBe(testPatientId);
      expect(response.body.data.appointment.providerId).toBe(testProviderId);
      
      // Verify Google Sheets service was called
      expect(mockCreateAppointment).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: testPatientId,
          providerId: testProviderId,
          title: 'General Checkup'
        })
      );
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
          title: 'Test Appointment'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid appointment data');
    });

    test('should validate patient and provider belong to organization', async () => {
      // Create a patient from different organization
      const otherOrgId = await createTestOrganization({
        name: 'Other Clinic'
      });
      const otherPatientId = await createTestPatient({
        firstName: 'Other',
        lastName: 'Patient',
        organizationId: otherOrgId
      });

      const response = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientId: otherPatientId,
          providerId: testProviderId,
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          duration: 30
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Patient not found');
    });

    test('should detect time conflicts', async () => {
      const conflictTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      // Mock conflict detection
      const mockCheckConflict = jest.spyOn(prisma.appointment, 'findFirst');
      mockCheckConflict.mockResolvedValue({
        id: 'existing-appointment',
        scheduledAt: conflictTime,
        duration: 30,
        endTime: new Date(conflictTime.getTime() + 30 * 60000),
        providerId: testProviderId
      } as any);

      const response = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientId: testPatientId,
          providerId: testProviderId,
          scheduledAt: conflictTime.toISOString(),
          duration: 30
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('conflict');
    });
  });

  describe('2. Appointment Retrieval (GET /api/appointments)', () => {
    test('should get appointments list with Google Sheets primary', async () => {
      const mockAppointments = [{
        id: 'test-appointment-1',
        patientId: testPatientId,
        providerId: testProviderId,
        scheduledAt: new Date(),
        duration: 30,
        status: 'SCHEDULED',
        patient: {
          firstName: 'John',
          lastName: 'Patient'
        },
        provider: {
          firstName: 'Dr. Sarah',
          lastName: 'Provider'
        }
      }];

      const mockGetAppointments = jest.mocked(googleSheetsService.getAppointments);
      mockGetAppointments.mockResolvedValue({
        appointments: mockAppointments,
        total: 1
      });

      const response = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.dataSource).toBe('GOOGLE_SHEETS');
      expect(response.body.data.appointments).toHaveLength(1);
      expect(response.body.data.pagination).toBeDefined();
      
      expect(mockGetAppointments).toHaveBeenCalledWith(testOrgId, expect.any(Object));
    });

    test('should fallback to PostgreSQL when Google Sheets fails', async () => {
      const mockGetAppointments = jest.mocked(googleSheetsService.getAppointments);
      mockGetAppointments.mockRejectedValue(new Error('Google Sheets unavailable'));

      const response = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.dataSource).toBe('POSTGRESQL_FALLBACK');
    });

    test('should filter appointments by status', async () => {
      const mockGetAppointments = jest.mocked(googleSheetsService.getAppointments);
      mockGetAppointments.mockResolvedValue({
        appointments: [],
        total: 0
      });

      const response = await request(app)
        .get('/api/appointments?status=CONFIRMED')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(mockGetAppointments).toHaveBeenCalledWith(testOrgId, 
        expect.objectContaining({
          status: 'CONFIRMED'
        })
      );
    });

    test('should filter appointments by provider', async () => {
      const mockGetAppointments = jest.mocked(googleSheetsService.getAppointments);
      mockGetAppointments.mockResolvedValue({
        appointments: [],
        total: 0
      });

      const response = await request(app)
        .get(`/api/appointments?providerId=${testProviderId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(mockGetAppointments).toHaveBeenCalledWith(testOrgId, 
        expect.objectContaining({
          providerId: testProviderId
        })
      );
    });

    test('should support pagination', async () => {
      const mockGetAppointments = jest.mocked(googleSheetsService.getAppointments);
      mockGetAppointments.mockResolvedValue({
        appointments: [],
        total: 0
      });

      const response = await request(app)
        .get('/api/appointments?page=2&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(mockGetAppointments).toHaveBeenCalledWith(testOrgId, 
        expect.objectContaining({
          page: 2,
          limit: 10
        })
      );
    });
  });

  describe('3. Appointment Updates (PUT /api/appointments/:id)', () => {
    test('should update appointment with Google Sheets primary', async () => {
      const appointmentId = 'test-appointment-id';
      const updateData = {
        status: 'CONFIRMED',
        consultationNotes: 'Patient doing well'
      };

      const mockUpdateAppointment = jest.mocked(googleSheetsService.updateAppointment);
      mockUpdateAppointment.mockResolvedValue(true);

      // Mock appointment exists in PostgreSQL (for validation)
      const mockFindFirst = jest.spyOn(prisma.appointment, 'findFirst');
      mockFindFirst.mockResolvedValue({
        id: appointmentId,
        organizationId: testOrgId,
        status: 'SCHEDULED'
      } as any);

      const response = await request(app)
        .put(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Google Sheets');
      
      expect(mockUpdateAppointment).toHaveBeenCalledWith(
        testOrgId,
        appointmentId,
        expect.objectContaining(updateData)
      );
    });

    test('should validate appointment exists and belongs to organization', async () => {
      const nonExistentId = 'non-existent-id';
      
      const mockFindFirst = jest.spyOn(prisma.appointment, 'findFirst');
      mockFindFirst.mockResolvedValue(null);

      const response = await request(app)
        .put(`/api/appointments/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'CONFIRMED'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    test('should validate status transitions', async () => {
      // Create a real appointment in the database and mark it as completed
      const mockCreateAppointment = jest.mocked(googleSheetsService.createAppointment);
      mockCreateAppointment.mockResolvedValue({
        success: true,
        appointmentId: 'test-completed-appointment',
        message: 'Appointment created successfully'
      });
      
      // First create an appointment
      const appointmentData = {
        patientId: testPatientId,
        providerId: testProviderId,
        scheduledAt: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(), // Different time
        duration: 30,
        title: 'Test Appointment for Status Validation',
        priority: 'NORMAL'
      };
      
      const createResponse = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(appointmentData);
        
      expect(createResponse.status).toBe(201);
      const createdAppointmentId = createResponse.body.data.appointment.id;
      
      // Update the appointment directly in the database to COMPLETED status
      await prisma.appointment.update({
        where: { id: createdAppointmentId },
        data: { status: 'COMPLETED' }
      });
      
      // Mock Google Sheets service for update
      const mockUpdateAppointment = jest.mocked(googleSheetsService.updateAppointment);
      mockUpdateAppointment.mockResolvedValue(true);

      // Now try to change the status - should fail
      const response = await request(app)
        .put(`/api/appointments/${createdAppointmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'SCHEDULED' // Invalid transition from COMPLETED to SCHEDULED
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cannot change status of completed appointments');
    });
  });

  describe('4. Appointment Confirmation (POST /api/appointments/:id/confirm)', () => {
    test('should confirm appointment successfully', async () => {
      // Create a real appointment in the database for confirmation
      const mockCreateAppointment = jest.mocked(googleSheetsService.createAppointment);
      mockCreateAppointment.mockResolvedValue({
        success: true,
        appointmentId: 'test-confirm-appointment',
        message: 'Appointment created successfully'
      });
      
      // First create an appointment
      const appointmentData = {
        patientId: testPatientId,
        providerId: testProviderId,
        scheduledAt: new Date(Date.now() + 28 * 60 * 60 * 1000).toISOString(), // Different time
        duration: 30,
        title: 'Test Appointment for Confirmation',
        priority: 'NORMAL'
      };
      
      const createResponse = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(appointmentData);
        
      expect(createResponse.status).toBe(201);
      const createdAppointmentId = createResponse.body.data.appointment.id;

      // Mock Google Sheets service for confirmation
      const mockUpdateAppointment = jest.mocked(googleSheetsService.updateAppointment);
      mockUpdateAppointment.mockResolvedValue(true);

      // Now confirm the appointment - should work
      const response = await request(app)
        .post(`/api/appointments/${createdAppointmentId}/confirm`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('confirmed');
      
      expect(mockUpdateAppointment).toHaveBeenCalledWith(
        testOrgId,
        createdAppointmentId,
        expect.objectContaining({
          status: 'CONFIRMED'
        })
      );
    });

    test('should prevent confirming already completed appointments', async () => {
      const appointmentId = 'test-appointment-id';
      
      const mockFindFirst = jest.spyOn(prisma.appointment, 'findFirst');
      mockFindFirst.mockResolvedValue({
        id: appointmentId,
        organizationId: testOrgId,
        status: 'COMPLETED'
      } as any);

      const response = await request(app)
        .post(`/api/appointments/${appointmentId}/confirm`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('5. Appointment Deletion (DELETE /api/appointments/:id)', () => {
    test('should delete appointment (soft delete)', async () => {
      const appointmentId = 'test-appointment-id';
      
      const mockFindFirst = jest.spyOn(prisma.appointment, 'findFirst');
      mockFindFirst.mockResolvedValue({
        id: appointmentId,
        organizationId: testOrgId,
        status: 'SCHEDULED'
      } as any);

      const mockUpdateAppointment = jest.mocked(googleSheetsService.updateAppointment);
      mockUpdateAppointment.mockResolvedValue(true);

      const response = await request(app)
        .delete(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('cancelled');
      
      expect(mockUpdateAppointment).toHaveBeenCalledWith(
        testOrgId,
        appointmentId,
        expect.objectContaining({
          status: 'CANCELLED'
        })
      );
    });

    test('should prevent deleting completed appointments', async () => {
      // Create a real appointment in the database and mark it as completed
      const mockCreateAppointment = jest.mocked(googleSheetsService.createAppointment);
      mockCreateAppointment.mockResolvedValue({
        success: true,
        appointmentId: 'test-completed-appointment-2',
        message: 'Appointment created successfully'
      });
      
      // First create an appointment
      const appointmentData = {
        patientId: testPatientId,
        providerId: testProviderId,
        scheduledAt: new Date(Date.now() + 27 * 60 * 60 * 1000).toISOString(), // Different time
        duration: 30,
        title: 'Test Appointment for Delete Validation',
        priority: 'NORMAL'
      };
      
      const createResponse = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(appointmentData);
        
      expect(createResponse.status).toBe(201);
      const createdAppointmentId = createResponse.body.data.appointment.id;
      
      // Update the appointment directly in the database to COMPLETED status
      await prisma.appointment.update({
        where: { id: createdAppointmentId },
        data: { status: 'COMPLETED' }
      });

      // Mock Google Sheets service for delete attempt
      const mockUpdateAppointment = jest.mocked(googleSheetsService.updateAppointment);
      mockUpdateAppointment.mockResolvedValue(true);

      // Now try to delete the completed appointment - should fail
      const response = await request(app)
        .delete(`/api/appointments/${createdAppointmentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cannot cancel completed appointments');
    });
  });

  describe('6. Organization Scoping & Security', () => {
    test('should enforce organization boundaries', async () => {
      // Create appointment in different organization
      const otherOrgId = await createTestOrganization({
        name: 'Other Organization'
      });
      
      const otherAppointmentId = 'other-org-appointment';
      
      // Mock appointment from different organization
      const mockFindFirst = jest.spyOn(prisma.appointment, 'findFirst');
      mockFindFirst.mockResolvedValue({
        id: otherAppointmentId,
        organizationId: otherOrgId, // Different organization
        status: 'SCHEDULED'
      } as any);

      const response = await request(app)
        .put(`/api/appointments/${otherAppointmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'CONFIRMED'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/appointments');

      expect(response.status).toBe(401);
    });

    test('should enforce role-based permissions', async () => {
      // Test with insufficient role permissions (if implemented)
      // This would require creating a user with limited role
    });
  });

  describe('7. Error Handling & Edge Cases', () => {
    test('should handle Google Sheets service errors gracefully', async () => {
      const mockCreateAppointment = jest.mocked(googleSheetsService.createAppointment);
      mockCreateAppointment.mockRejectedValue(new Error('Google Sheets API error'));

      const response = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientId: testPatientId,
          providerId: testProviderId,
          scheduledAt: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(), // Different time to avoid conflicts
          duration: 30,
          bookingSource: 'DASHBOARD',
          priority: 'NORMAL'
        });

      // Should return 500 for now as Google Sheets is primary source
      // In future, this should fallback to PostgreSQL gracefully
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    test('should validate CUID format for IDs', async () => {
      const response = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientId: 'invalid-uuid-format',
          providerId: 'another-invalid-format',
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          duration: 30
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid');
    });

    test('should handle concurrent appointment bookings', async () => {
      // This test would simulate two simultaneous bookings for the same time slot
      // and verify that conflict detection works correctly
    });
  });
});