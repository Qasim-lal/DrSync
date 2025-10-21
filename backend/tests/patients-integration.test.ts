import { jest } from '@jest/globals';
import request from 'supertest';
import { app } from '../src/app';
import { authService } from '../src/services/auth';
import { getPrismaClient } from '../src/services/prisma';
import googleSheetsService from '../src/services/googleSheetsService';

// Mock Google Sheets service
jest.mock('../src/services/googleSheetsService');

const prisma = getPrismaClient();

// Test users with different roles for comprehensive RBAC testing
const testUsers = {
  superAdmin: {
    id: 'test-super-admin-id',
    email: 'superadmin@drsync.com',
    role: 'SUPER_ADMIN',
    organizationId: 'test-org-healthcare-1',
    token: ''
  },
  orgAdmin: {
    id: 'test-org-admin-id',
    email: 'admin@drsynctesthospital.com',
    role: 'ORG_ADMIN',
    organizationId: 'test-org-healthcare-1',
    token: ''
  },
  orgAdmin2: {
    id: 'test-org-admin-2-id',
    email: 'admin@familyclinic.com',
    role: 'ORG_ADMIN',
    organizationId: 'test-org-clinic-2',
    token: ''
  },
  doctor: {
    id: 'test-doctor-id',
    email: 'dr.smith@drsynctesthospital.com',
    role: 'DOCTOR',
    organizationId: 'test-org-healthcare-1',
    token: ''
  },
  nurse: {
    id: 'test-nurse-id',
    email: 'nurse.wilson@drsynctesthospital.com',
    role: 'NURSE',
    organizationId: 'test-org-healthcare-1',
    token: ''
  },
  staff: {
    id: 'test-staff-id',
    email: 'staff@drsynctesthospital.com',
    role: 'STAFF',
    organizationId: 'test-org-healthcare-1',
    token: ''
  }
};

const samplePatientData = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  dateOfBirth: '1985-05-15',
  gender: 'MALE',
  address: '123 Main St, Anytown, AT 12345',
  emergencyContact: 'Jane Doe',
  emergencyPhone: '+1234567891',
  medicalHistory: 'No significant medical history',
  allergies: 'None known',
  currentMedications: 'None',
  insuranceProvider: 'Health Plus',
  insuranceNumber: 'HP123456789',
  notes: 'Regular checkup patient'
};

let createdPatientId: string;

describe('Patient Management API - RBAC Integration Tests', () => {
  let patientIdCounter = 0;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations for each test
    const mockCreatePatient = jest.mocked(googleSheetsService.createPatient);
    mockCreatePatient.mockImplementation(() => {
      patientIdCounter++;
      return Promise.resolve({
        success: true,
        patientId: `mock-patient-id-${patientIdCounter}`,
        message: 'Patient created successfully in Google Sheets'
      });
    });
    
    const mockUpdatePatient = jest.mocked(googleSheetsService.updatePatient);
    mockUpdatePatient.mockResolvedValue(true);
    
    const mockGetPatient = jest.mocked(googleSheetsService.getPatient);
    mockGetPatient.mockRejectedValue(new Error('Google Sheets single patient reading not yet fully implemented'));
    
    const mockGetPatients = jest.mocked(googleSheetsService.getPatients);
    mockGetPatients.mockRejectedValue(new Error('Google Sheets patients reading not yet fully implemented'));
  });
  
  beforeAll(async () => {

    // Clean up existing test data
    await prisma.patient.deleteMany({
      where: {
        organizationId: { in: ['test-org-healthcare-1', 'test-org-clinic-2'] }
      }
    });
    
    await prisma.user.deleteMany({
      where: {
        id: { in: Object.values(testUsers).map(u => u.id) }
      }
    });
    
    await prisma.organization.deleteMany({
      where: {
        id: { in: ['test-org-healthcare-1', 'test-org-clinic-2'] }
      }
    });

    // Create test organizations with Google credentials
    const testGoogleCredentials = {
      type: 'service_account',
      project_id: 'test-project',
      private_key_id: 'test-key-id',
      private_key: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
      client_email: 'test@test-project.iam.gserviceaccount.com',
      client_id: 'test-client-id',
      spreadsheetId: 'test-spreadsheet-id'
    };

    await prisma.organization.createMany({
      data: [
        {
          id: 'test-org-healthcare-1',
          name: 'DrSync Test Hospital',
          slug: 'drsync-test-hospital',
          address: '123 Test St',
          phone: '+1234567890',
          email: 'admin@drsynctesthospital.com',
          isActive: true,
          googleCredentials: testGoogleCredentials as any
        },
        {
          id: 'test-org-clinic-2',
          name: 'Family Clinic',
          slug: 'family-clinic',
          address: '456 Test Ave',
          phone: '+1987654321',
          email: 'admin@familyclinic.com',
          isActive: true,
          googleCredentials: testGoogleCredentials as any
        }
      ]
    });

    // Create test users with hashed passwords
    for (const [, user] of Object.entries(testUsers)) {
      const hashedPassword = await authService.hashPassword('testPassword123!');
      await prisma.user.create({
        data: {
          id: user.id,
          email: user.email,
          password: hashedPassword,
          firstName: user.email.split('@')[0] || 'Test',
          lastName: 'User',
          role: user.role as any,
          organizationId: user.organizationId,
          isActive: true,
          emailVerified: true
        }
      });
    }
    
    // Generate tokens for all test users
    for (const [, user] of Object.entries(testUsers)) {
      const token = authService.generateAccessToken({
        userId: user.id,
        role: user.role,
        organizationId: user.organizationId,
        email: user.email
      });
      user.token = token;
    }
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.patient.deleteMany({
      where: {
        organizationId: { in: ['test-org-healthcare-1', 'test-org-clinic-2'] }
      }
    });
    
    await prisma.user.deleteMany({
      where: {
        id: { in: Object.values(testUsers).map(u => u.id) }
      }
    });
    
    await prisma.organization.deleteMany({
      where: {
        id: { in: ['test-org-healthcare-1', 'test-org-clinic-2'] }
      }
    });
    
    await prisma.$disconnect();
  });

  describe('POST /api/patients - Create Patient', () => {
    test('Should allow NURSE to create patient', async () => {
      const response = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${testUsers.nurse.token}`)
        .send(samplePatientData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Patient created successfully');
      expect(response.body.data.patient).toBeDefined();
      expect(response.body.data.patient.firstName).toBe(samplePatientData.firstName);
      expect(response.body.data.patient.lastName).toBe(samplePatientData.lastName);

      createdPatientId = response.body.data.patient.id;
    });

    test('Should allow DOCTOR to create patient', async () => {
      const doctorPatientData = {
        ...samplePatientData,
        firstName: 'Jane',
        email: 'jane.smith@example.com',
        phone: '+1234567892'
      };

      const response = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${testUsers.doctor.token}`)
        .send(doctorPatientData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.patient.firstName).toBe('Jane');
    });

    test('Should allow ORG_ADMIN to create patient', async () => {
      const adminPatientData = {
        ...samplePatientData,
        firstName: 'Bob',
        email: 'bob.admin@example.com',
        phone: '+1234567893'
      };

      const response = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${testUsers.orgAdmin.token}`)
        .send(adminPatientData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.patient.firstName).toBe('Bob');
    });

    test('Should DENY STAFF from creating patient', async () => {
      const response = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${testUsers.staff.token}`)
        .send({
          ...samplePatientData,
          firstName: 'Rejected',
          phone: '+1234567894'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied: Insufficient permissions');
    });

    test('Should allow duplicate phone number in same organization (family members)', async () => {
      // Note: The system allows duplicate phone numbers for family members
      const familyMemberData = {
        ...samplePatientData,
        firstName: 'Family',
        lastName: 'Member',
        email: 'family@example.com',
        phone: samplePatientData.phone, // Same phone as original patient
        relationToPrimaryContact: 'spouse'
      };

      const response = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${testUsers.nurse.token}`)
        .send(familyMemberData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Patient created successfully');
    });

    test('Should validate required fields', async () => {
      const invalidData = {
        firstName: '', // Missing required field
        lastName: 'Test',
        phone: 'invalid-phone', // Invalid format
        dateOfBirth: '2025-01-01', // Future date
        gender: 'INVALID' // Invalid enum
      };

      const response = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${testUsers.nurse.token}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid patient data');
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/patients - List Patients', () => {
    test('Should allow STAFF to view patient list (basic fields only)', async () => {
      const response = await request(app)
        .get('/api/patients')
        .set('Authorization', `Bearer ${testUsers.staff.token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.patients).toBeDefined();
      expect(response.body.data.pagination).toBeDefined();

      // STAFF should not see sensitive medical fields
      if (response.body.data.patients.length > 0) {
        const patient = response.body.data.patients[0];
        expect(patient.medicalHistory).toBeUndefined();
        expect(patient.allergies).toBeUndefined();
        expect(patient.notes).toBeUndefined();
      }
    });

    test('Should allow DOCTOR to view patient list with medical fields', async () => {
      const response = await request(app)
        .get('/api/patients')
        .set('Authorization', `Bearer ${testUsers.doctor.token}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // DOCTOR should see sensitive medical fields
      if (response.body.data.patients.length > 0) {
        const patient = response.body.data.patients[0];
        expect(patient.medicalHistory).toBeDefined();
        expect(patient.allergies).toBeDefined();
        // Note: notes field is not included in the select in controller
      }
    });

    test('Should support pagination and search', async () => {
      const response = await request(app)
        .get('/api/patients?page=1&limit=5&search=John&sortBy=firstName&sortOrder=asc')
        .set('Authorization', `Bearer ${testUsers.nurse.token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
    });

    test('Should enforce organization isolation', async () => {
      // Org2 admin should not see Org1 patients
      const response = await request(app)
        .get('/api/patients')
        .set('Authorization', `Bearer ${testUsers.orgAdmin2.token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should return empty or different patients (not from org1)
      const org1PatientExists = response.body.data.patients.some((p: any) => 
        p.firstName === 'John' && p.lastName === 'Doe'
      );
      expect(org1PatientExists).toBe(false);
    });
  });

  describe('GET /api/patients/:id - Get Single Patient', () => {
    test('Should allow authorized user to view patient in same org', async () => {
      if (!createdPatientId) {
        throw new Error('No patient created for testing');
      }

      const response = await request(app)
        .get(`/api/patients/${createdPatientId}`)
        .set('Authorization', `Bearer ${testUsers.nurse.token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.patient.id).toBe(createdPatientId);
      expect(response.body.data.patient.firstName).toBe('John');
    });

    test('Should DENY access to patient from different organization', async () => {
      if (!createdPatientId) {
        throw new Error('No patient created for testing');
      }

      const response = await request(app)
        .get(`/api/patients/${createdPatientId}`)
        .set('Authorization', `Bearer ${testUsers.orgAdmin2.token}`) // Different org
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Patient not found');
    });

    test('Should return 404 for non-existent patient', async () => {
      const response = await request(app)
        .get('/api/patients/non-existent-id')
        .set('Authorization', `Bearer ${testUsers.nurse.token}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Patient not found');
    });
  });

  describe('PUT /api/patients/:id - Update Patient', () => {
    test('Should allow NURSE to update patient', async () => {
      if (!createdPatientId) {
        throw new Error('No patient created for testing');
      }

      const updateData = {
        firstName: 'John Updated',
        address: '456 New Street, Updated City, UC 54321'
      };

      const response = await request(app)
        .put(`/api/patients/${createdPatientId}`)
        .set('Authorization', `Bearer ${testUsers.nurse.token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Patient updated successfully');
      expect(response.body.data.patient.firstName).toBe('John Updated');
      expect(response.body.data.patient.address).toBe(updateData.address);
    });

    test('Should DENY STAFF from updating patient', async () => {
      if (!createdPatientId) {
        throw new Error('No patient created for testing');
      }

      const response = await request(app)
        .put(`/api/patients/${createdPatientId}`)
        .set('Authorization', `Bearer ${testUsers.staff.token}`)
        .send({ firstName: 'Staff Update' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied: Insufficient permissions');
    });

    test('Should allow updating to duplicate phone number (family members)', async () => {
      if (!createdPatientId) {
        throw new Error('No patient created for testing');
      }

      // Create another patient first
      const anotherPatient = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${testUsers.nurse.token}`)
        .send({
          ...samplePatientData,
          firstName: 'Another',
          email: 'another@example.com',
          phone: '+1987654321'
        });

      const anotherPatientId = anotherPatient.body.data.patient.id;

      // Update first patient with second patient's phone (allowed for family members)
      const response = await request(app)
        .put(`/api/patients/${createdPatientId}`)
        .set('Authorization', `Bearer ${testUsers.nurse.token}`)
        .send({ phone: '+1987654321' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Patient updated successfully');

      // Cleanup
      await prisma.patient.delete({ where: { id: anotherPatientId } });
    });
  });

  describe('GET /api/patients/stats - Patient Statistics', () => {
    test('Should allow DOCTOR to view patient statistics', async () => {
      const response = await request(app)
        .get('/api/patients/stats')
        .set('Authorization', `Bearer ${testUsers.doctor.token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalPatients).toBeDefined();
      expect(response.body.data.newPatientsThisMonth).toBeDefined();
      expect(response.body.data.genderDistribution).toBeDefined();
      expect(response.body.data.ageDistribution).toBeDefined();
    });

    test('Should DENY STAFF from viewing statistics', async () => {
      const response = await request(app)
        .get('/api/patients/stats')
        .set('Authorization', `Bearer ${testUsers.staff.token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied: Insufficient permissions');
    });

    test('Should DENY NURSE from viewing statistics', async () => {
      const response = await request(app)
        .get('/api/patients/stats')
        .set('Authorization', `Bearer ${testUsers.nurse.token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied: Insufficient permissions');
    });
  });

  describe('DELETE /api/patients/:id - Delete Patient', () => {
    test('Should DENY DOCTOR from deleting patient', async () => {
      if (!createdPatientId) {
        throw new Error('No patient created for testing');
      }

      const response = await request(app)
        .delete(`/api/patients/${createdPatientId}`)
        .set('Authorization', `Bearer ${testUsers.doctor.token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied: Insufficient permissions');
    });

    test('Should allow ORG_ADMIN to delete patient', async () => {
      if (!createdPatientId) {
        throw new Error('No patient created for testing');
      }

      const response = await request(app)
        .delete(`/api/patients/${createdPatientId}`)
        .set('Authorization', `Bearer ${testUsers.orgAdmin.token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Patient deleted successfully');

      // Verify patient is actually deleted
      await request(app)
        .get(`/api/patients/${createdPatientId}`)
        .set('Authorization', `Bearer ${testUsers.orgAdmin.token}`)
        .expect(404);

      createdPatientId = ''; // Mark as deleted
    });

    test('Should return 404 for non-existent patient deletion', async () => {
      const response = await request(app)
        .delete('/api/patients/non-existent-id')
        .set('Authorization', `Bearer ${testUsers.orgAdmin.token}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Patient not found');
    });
  });

  describe('Authentication Requirements', () => {
    test('Should require authentication for all endpoints', async () => {
      // Test without token
      await request(app).get('/api/patients').expect(401);
      await request(app).post('/api/patients').expect(401);
      await request(app).get('/api/patients/test-id').expect(401);
      await request(app).put('/api/patients/test-id').expect(401);
      await request(app).delete('/api/patients/test-id').expect(401);
      await request(app).get('/api/patients/stats').expect(401);
    });

    test('Should reject invalid tokens', async () => {
      const invalidToken = 'invalid-jwt-token';
      
      const response = await request(app)
        .get('/api/patients')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid or expired access token');
    });
  });
});
