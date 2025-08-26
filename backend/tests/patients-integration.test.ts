import request from 'supertest';
import { app } from '../src/index';
import { PrismaClient } from '@prisma/client';
import { generateTokens } from '../src/services/auth';

const prisma = new PrismaClient();

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
  beforeAll(async () => {
    // Generate tokens for all test users
    for (const [key, user] of Object.entries(testUsers)) {
      const tokens = generateTokens(user.id, user.role as any, user.organizationId);
      user.token = tokens.accessToken;
    }
  });

  afterAll(async () => {
    // Cleanup test data
    if (createdPatientId) {
      await prisma.patient.deleteMany({
        where: { id: createdPatientId }
      });
    }
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
      expect(response.body.message).toBe('Patient created successfully');
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

    test('Should prevent duplicate phone number in same organization', async () => {
      const duplicatePhoneData = {
        ...samplePatientData,
        firstName: 'Duplicate',
        email: 'duplicate@example.com',
        phone: samplePatientData.phone // Same phone as original patient
      };

      const response = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${testUsers.nurse.token}`)
        .send(duplicatePhoneData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('phone number already exists');
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
        expect(patient.notes).toBeDefined();
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
      expect(response.body.message).toBe('Patient updated successfully');
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

    test('Should prevent updating to duplicate phone number', async () => {
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

      // Try to update first patient with second patient's phone
      const response = await request(app)
        .put(`/api/patients/${createdPatientId}`)
        .set('Authorization', `Bearer ${testUsers.nurse.token}`)
        .send({ phone: '+1987654321' })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('phone number already exists');

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
      const verifyResponse = await request(app)
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
      expect(response.body.message).toBe('Invalid or expired token');
    });
  });
});
