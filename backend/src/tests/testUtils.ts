/**
 * Test Utilities - Database Setup and Test Data Management
 * 
 * Utilities for creating test data, managing test database state,
 * and providing common test fixtures for sync operations testing.
 * 
 * Features:
 * 1. Test database initialization and cleanup
 * 2. Test organization, user, patient, provider creation
 * 3. Mock Google Sheets API responses
 * 4. Test data factories with realistic data
 * 5. Database isolation between tests
 * 6. Performance test helpers
 * 
 * @version 1.0
 * @author DrSync Development Team
 * @date September 12, 2025
 */

import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Construct DATABASE_URL from individual environment variables
const constructDatabaseUrl = (): string => {
  const host = process.env.DB_HOST || 'postgres'; // Use postgres service name in Docker
  const port = process.env.DB_PORT || '5432';
  const database = process.env.DB_NAME || 'drsync_dev';
  const user = process.env.DB_USER || 'drsync_user';
  const password = process.env.DB_PASSWORD || 'drsync_password_dev';
  
  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
};

// Create a separate Prisma instance for testing
export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: constructDatabaseUrl()
    }
  }
});

// Test data interfaces
export interface TestOrganization {
  id: string;
  name: string;
  subscriptionTier: 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE';
  isActive: boolean;
  googleSheetsId?: string;
  settings: any;
}

export interface TestUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'STAFF' | 'NURSE' | 'DOCTOR' | 'ORG_ADMIN' | 'SUPER_ADMIN';
  organizationId: string;
  password?: string;
}

export interface TestPatient {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  organizationId: string;
  dateOfBirth?: Date;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
}

export interface TestProvider {
  id: string;
  firstName: string;
  lastName: string;
  specialization: string;
  consultationDuration: number;
  organizationId: string;
  title?: string;
  consultationFee?: number;
  workingHours?: Record<string, string[]>;
  email?: string;
}

export interface TestAppointment {
  id: string;
  patientId: string;
  providerId: string;
  scheduledAt: Date;
  duration: number;
  status: 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  organizationId: string;
  title?: string;
  description?: string;
}

/**
 * Clean up all test data from database
 */
export async function cleanupTestData(): Promise<void> {
  try {
    // For now, use a broader cleanup approach based on emails
    // Delete test organizations that have test emails
    const testOrgs = await testPrisma.organization.findMany({
      where: {
        email: {
          contains: 'test-'
        }
      },
      select: { id: true }
    });

    const testOrgIds = testOrgs.map(org => org.id);
    
    if (testOrgIds.length > 0) {
      // Delete in reverse order of dependencies
      await testPrisma.appointment.deleteMany({
        where: {
          organizationId: {
            in: testOrgIds
          }
        }
      });

      await testPrisma.whatsAppMessage.deleteMany({
        where: {
          organizationId: {
            in: testOrgIds
          }
        }
      });

      await testPrisma.auditLog.deleteMany({
        where: {
          organizationId: {
            in: testOrgIds
          }
        }
      });

      await testPrisma.billingRecord.deleteMany({
        where: {
          organizationId: {
            in: testOrgIds
          }
        }
      });

      await testPrisma.systemMetric.deleteMany({
        where: {
          organizationId: {
            in: testOrgIds
          }
        }
      });

      await testPrisma.user.deleteMany({
        where: {
          organizationId: {
            in: testOrgIds
          }
        }
      });

      await testPrisma.patient.deleteMany({
        where: {
          organizationId: {
            in: testOrgIds
          }
        }
      });

      await testPrisma.provider.deleteMany({
        where: {
          organizationId: {
            in: testOrgIds
          }
        }
      });

      await testPrisma.organization.deleteMany({
        where: {
          id: {
            in: testOrgIds
          }
        }
      });
    }

    console.log('Test data cleanup completed');
  } catch (error) {
    console.error('Error during test data cleanup:', error);
  }
}

/**
 * Create test organization
 */
export async function createTestOrganization(orgData: Partial<TestOrganization> = {}): Promise<string> {
  const uniqueId = uuidv4().substring(0, 8); // Use short UUID for readability
  const organizationData = {
    // Remove id field to let Prisma generate CUID
    name: orgData.name || `Test Healthcare Clinic ${uniqueId}`,
    slug: `test-healthcare-clinic-${uniqueId}`, // Always use unique slug
    email: `test-${uuidv4()}@example.com`,
    subscriptionPlan: orgData.subscriptionTier || 'PROFESSIONAL',
    isActive: orgData.isActive !== false,
    googleSheetsId: orgData.googleSheetsId || `test-sheet-${uuidv4()}`,
    whatsappCredentials: {
      phoneNumberId: 'test-phone-number-id',
      accessToken: 'test-access-token',
      businessAccountId: 'test-business-account-id'
    },
    // settings removed - not in schema
    // createdAt and updatedAt are auto-generated
  };

  const organization = await testPrisma.organization.create({
    data: organizationData
  });

  return organization.id;
}

/**
 * Create test user
 */
export async function createTestUser(userData: Partial<TestUser> = {}): Promise<string> {
  // Generate proper bcrypt hash for the test password 'password123'
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const userCreateData = {
    // Remove id field to let Prisma generate CUID
    email: userData.email || `test-${uuidv4()}@example.com`,
    firstName: userData.firstName || 'Test',
    lastName: userData.lastName || 'User',
    role: userData.role || 'DOCTOR',
    organizationId: userData.organizationId || `test-org-${uuidv4()}`,
    password: hashedPassword,
    isActive: true,
    emailVerified: true
    // createdAt and updatedAt are auto-generated
  };

  const user = await testPrisma.user.create({
    data: userCreateData
  });

  return user.id;
}

/**
 * Create test patient
 */
export async function createTestPatient(patientData: Partial<TestPatient> = {}): Promise<string> {
  const patientCreateData = {
    // Remove id field to let Prisma generate CUID
    firstName: patientData.firstName || 'John',
    lastName: patientData.lastName || 'Doe',
    phone: patientData.phone || `+92300${Math.floor(1000000 + Math.random() * 9000000)}`,
    email: patientData.email || `patient-${uuidv4()}@example.com`,
    organizationId: patientData.organizationId || `test-org-${uuidv4()}`,
    dateOfBirth: patientData.dateOfBirth || new Date('1990-01-01'),
    gender: patientData.gender || 'MALE',
    country: 'Pakistan',
    preferredLanguage: 'en'
    // Removed primaryContact, createdAt, updatedAt as they're not in the schema or are auto-generated
  };

  const patient = await testPrisma.patient.create({
    data: patientCreateData
  });

  return patient.id;
}

/**
 * Create test provider
 */
export async function createTestProvider(providerData: Partial<TestProvider> = {}): Promise<string> {
  const defaultWorkingHours = {
    monday: ['09:00', '17:00'],
    tuesday: ['09:00', '17:00'],
    wednesday: ['09:00', '17:00'],
    thursday: ['09:00', '17:00'],
    friday: ['09:00', '17:00'],
    saturday: ['09:00', '13:00'],
    sunday: []
  };

  const providerCreateData = {
    // Remove id field to let Prisma generate CUID
    firstName: providerData.firstName || 'Dr. Sarah',
    lastName: providerData.lastName || 'Smith',
    title: providerData.title || 'Dr.',
    specialization: providerData.specialization || 'General Medicine',
    consultationDuration: providerData.consultationDuration || 30,
    consultationFee: providerData.consultationFee || 100,
    currency: 'USD',
    organizationId: providerData.organizationId || `test-org-${uuidv4()}`,
    isActive: true,
    workingHours: providerData.workingHours || defaultWorkingHours
    // createdAt and updatedAt are auto-generated
  };

  const provider = await testPrisma.provider.create({
    data: providerCreateData
  });

  return provider.id;
}

/**
 * Create test appointment
 */
export async function createTestAppointment(appointmentData: Partial<TestAppointment> = {}): Promise<string> {
  const scheduledAt = appointmentData.scheduledAt || new Date(Date.now() + 24 * 60 * 60 * 1000);
  const duration = appointmentData.duration || 30;

  const appointmentCreateData = {
    id: appointmentData.id || `test-appointment-${uuidv4()}`,
    patientId: appointmentData.patientId || `test-patient-${uuidv4()}`,
    providerId: appointmentData.providerId || `test-provider-${uuidv4()}`,
    organizationId: appointmentData.organizationId || `test-org-${uuidv4()}`,
    scheduledAt: scheduledAt,
    duration: duration,
    endTime: new Date(scheduledAt.getTime() + duration * 60000),
    status: appointmentData.status || 'SCHEDULED',
    title: appointmentData.title || 'Test Appointment',
    description: appointmentData.description || 'Test appointment description',
    priority: 'NORMAL' as const,
    bookingSource: 'DASHBOARD' as const,
    reminderSent: false,
    followUpSent: false
    // createdAt and updatedAt are auto-generated
  };

  const appointment = await testPrisma.appointment.create({
    data: appointmentCreateData
  });

  return appointment.id;
}

/**
 * Create batch test data for performance testing
 */
export async function createBatchTestData(organizationId: string, counts: {
  patients?: number;
  providers?: number;
  appointments?: number;
} = {}): Promise<{
  patientIds: string[];
  providerIds: string[];
  appointmentIds: string[];
}> {
  const patientCount = counts.patients || 10;
  const providerCount = counts.providers || 3;
  const appointmentCount = counts.appointments || 20;

  // Create patients
  const patientPromises = Array(patientCount).fill(null).map((_, index) => 
    createTestPatient({
      firstName: `Patient${index + 1}`,
      lastName: `Test${index + 1}`,
      phone: `+923000000${String(index + 100).padStart(3, '0')}`,
      organizationId
    })
  );
  const patientIds = await Promise.all(patientPromises);

  // Create providers
  const providerPromises = Array(providerCount).fill(null).map((_, index) => 
    createTestProvider({
      firstName: `Dr. Provider${index + 1}`,
      lastName: `Test${index + 1}`,
      specialization: ['General Medicine', 'Cardiology', 'Dermatology'][index % 3] || 'General Medicine',
      organizationId
    })
  );
  const providerIds = await Promise.all(providerPromises);

  // Create appointments
  const appointmentPromises = Array(appointmentCount).fill(null).map((_, index) => {
    const patientId = patientIds[index % patientIds.length]!;
    const providerId = providerIds[index % providerIds.length]!;
    const scheduledAt = new Date(Date.now() + (index + 1) * 60 * 60 * 1000); // Each appointment 1 hour apart

    return createTestAppointment({
      patientId,
      providerId,
      organizationId,
      scheduledAt,
      title: `Appointment ${index + 1}`,
      status: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'][index % 4] as any
    });
  });
  const appointmentIds = await Promise.all(appointmentPromises);

  return {
    patientIds,
    providerIds,
    appointmentIds
  };
}

/**
 * Mock Google Sheets API responses
 */
export const mockGoogleSheetsResponses = {
  createAppointmentSuccess: {
    success: true,
    appointmentId: 'mock-appointment-id',
    message: 'Appointment created successfully'
  },

  createAppointmentConflict: {
    success: false,
    message: 'Appointment conflict detected. Next available slot: 2025-09-13T10:00:00Z'
  },

  getAppointmentsSuccess: (appointments: TestAppointment[]) => ({
    appointments,
    total: appointments.length
  }),

  updateAppointmentSuccess: true,

  lockSlotSuccess: {
    success: true
  },

  lockSlotConflict: {
    success: false,
    message: 'Slot is locked by another user until 2025-09-12T12:15:00Z'
  },

  templateCreationSuccess: {
    success: true,
    googleSheetsId: 'test_sheet_id_12345',
    structure: {
      structure: 'TABS' as const,
      googleSheetsId: 'test_sheet_id_12345',
      tabMappings: {
        appointments: 'Appointments',
        patients: 'Patients',
        providers: 'Providers'
      }
    }
  }
};

/**
 * Performance test helpers
 */
export class PerformanceTracker {
  private startTimes: Map<string, number> = new Map();
  private measurements: Map<string, number[]> = new Map();

  startTimer(operation: string): void {
    this.startTimes.set(operation, Date.now());
  }

  endTimer(operation: string): number {
    const startTime = this.startTimes.get(operation);
    if (!startTime) {
      throw new Error(`Timer for operation '${operation}' was not started`);
    }

    const duration = Date.now() - startTime;
    
    if (!this.measurements.has(operation)) {
      this.measurements.set(operation, []);
    }
    this.measurements.get(operation)!.push(duration);

    return duration;
  }

  getStats(operation: string): {
    count: number;
    average: number;
    min: number;
    max: number;
    median: number;
  } | null {
    const measurements = this.measurements.get(operation);
    if (!measurements || measurements.length === 0) {
      return null;
    }

    const sorted = [...measurements].sort((a, b) => a - b);
    return {
      count: measurements.length,
      average: measurements.reduce((sum, val) => sum + val, 0) / measurements.length,
      min: Math.min(...measurements),
      max: Math.max(...measurements),
      median: sorted[Math.floor(sorted.length / 2)] || 0
    };
  }

  getAllStats(): Record<string, ReturnType<PerformanceTracker['getStats']>> {
    const stats: Record<string, ReturnType<PerformanceTracker['getStats']>> = {};
    for (const [operation] of this.measurements) {
      stats[operation] = this.getStats(operation);
    }
    return stats;
  }

  reset(): void {
    this.startTimes.clear();
    this.measurements.clear();
  }
}

/**
 * Wait for a specified number of milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate random test data
 */
export const testDataGenerators = {
  randomPhone: () => `+92300${Math.floor(1000000 + Math.random() * 9000000)}`,
  randomEmail: () => `test-${uuidv4().substring(0, 8)}@example.com`,
  randomName: () => {
    const firstNames = ['John', 'Jane', 'Ahmed', 'Fatima', 'Ali', 'Ayesha', 'Hassan', 'Zara'];
    const lastNames = ['Smith', 'Johnson', 'Khan', 'Ahmed', 'Ali', 'Hassan', 'Shah', 'Malik'];
    return {
      firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
      lastName: lastNames[Math.floor(Math.random() * lastNames.length)]
    };
  },
  randomSpecialization: () => {
    const specializations = [
      'General Medicine', 'Cardiology', 'Dermatology', 'Pediatrics', 
      'Orthopedics', 'Neurology', 'Psychiatry', 'Gynecology'
    ];
    return specializations[Math.floor(Math.random() * specializations.length)];
  },
  randomAppointmentTime: (daysFromNow: number = 1) => {
    const baseTime = Date.now() + daysFromNow * 24 * 60 * 60 * 1000;
    const randomOffset = Math.floor(Math.random() * 8) * 60 * 60 * 1000; // 0-8 hours
    return new Date(baseTime + randomOffset);
  }
};

/**
 * Validate test environment setup
 */
export async function validateTestEnvironment(): Promise<{
  databaseConnected: boolean;
  testTablesAccessible: boolean;
  errors: string[];
}> {
  const result = {
    databaseConnected: false,
    testTablesAccessible: false,
    errors: [] as string[]
  };

  try {
    // Test database connection
    await testPrisma.$queryRaw`SELECT 1`;
    result.databaseConnected = true;

    // Test table access
    await testPrisma.organization.count();
    await testPrisma.user.count();
    await testPrisma.patient.count();
    await testPrisma.provider.count();
    await testPrisma.appointment.count();
    result.testTablesAccessible = true;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Database validation failed: ${errorMessage}`);
  }

  return result;
}

/**
 * Setup test environment
 */
export async function setupTestEnvironment(): Promise<void> {
  const validation = await validateTestEnvironment();
  
  if (!validation.databaseConnected) {
    throw new Error('Cannot connect to test database');
  }

  if (!validation.testTablesAccessible) {
    throw new Error('Cannot access required database tables');
  }

  console.log('Test environment validated successfully');
}

export default {
  cleanupTestData,
  createTestOrganization,
  createTestUser,
  createTestPatient,
  createTestProvider,
  createTestAppointment,
  createBatchTestData,
  mockGoogleSheetsResponses,
  PerformanceTracker,
  delay,
  testDataGenerators,
  validateTestEnvironment,
  setupTestEnvironment
};