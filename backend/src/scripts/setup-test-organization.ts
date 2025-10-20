/**
 * Setup Test Organization for WhatsApp Testing
 * TASK-040: Message Processing Pipeline
 * 
 * Creates a test organization with WhatsApp credentials configured
 * so we can test the complete message routing flow.
 * 
 * Usage:
 *   npx ts-node src/scripts/setup-test-organization.ts
 */

import { getPrismaClient } from '../services/prisma';
import { encryptData } from '../utils/encryption';
import logger from '../utils/logger';

const prisma = getPrismaClient();

async function setupTestOrganization() {
  try {
    logger.info('Setting up test organization for WhatsApp testing...');

    // Test WhatsApp credentials (will work with our mock server)
    const whatsappCredentials = {
      accessToken: 'test-access-token-for-mock-server',
      phoneNumberId: 'test123456789012345', // Matches mock server expectations
      businessAccountId: 'test-business-account-id',
      webhookVerifyToken: 'test-verify-token',
      appSecret: 'test-app-secret',
    };

    // Encrypt credentials (using encryption utility from TASK-039)
    const encryptedCredentials = encryptData(JSON.stringify(whatsappCredentials));

    // Check if test organization already exists
    const existing = await prisma.organization.findFirst({
      where: { slug: 'test-whatsapp-clinic' },
    });

    if (existing) {
      logger.info('Test organization already exists, updating...');
      
      const updated = await prisma.organization.update({
        where: { id: existing.id },
        data: {
          whatsappCredentials: encryptedCredentials,
          whatsappPhoneNumber: '+923001111111', // Test phone number
          whatsappBusinessId: 'test-business-account-id',
          whatsappPhoneVerified: true,
          whatsappConfigured: true,
          isActive: true,
        },
      });

      logger.info(`Updated existing organization: ${updated.id}`);
      logger.info(`Organization name: ${updated.name}`);
      logger.info(`WhatsApp phone: ${updated.whatsappPhoneNumber}`);
      
      return updated;
    }

    // Create new test organization
    const organization = await prisma.organization.create({
      data: {
        name: 'Test WhatsApp Clinic',
        slug: 'test-whatsapp-clinic',
        email: 'test-whatsapp@clinic.com',
        phone: '+923001111111',
        address: 'Test Address, Lahore',
        organizationType: 'CLINIC',
        
        // Subscription settings
        subscriptionPlan: 'PROFESSIONAL', // Use professional for testing
        subscriptionStatus: 'ACTIVE',
        
        // WhatsApp settings
        whatsappCredentials: encryptedCredentials,
        whatsappPhoneNumber: '+923001111111',
        whatsappBusinessId: 'test-business-account-id',
        whatsappPhoneVerified: true,
        whatsappConfigured: true,
        
        // Trial limits (generous for testing)
        maxPatients: 1000,
        maxAppointments: 5000,
        
        // System settings
        timezone: 'Asia/Karachi',
        language: 'en',
        region: 'PAKISTAN',
        isActive: true,
      },
    });

    logger.info('Test organization created successfully!');
    logger.info(`Organization ID: ${organization.id}`);
    logger.info(`Organization name: ${organization.name}`);
    logger.info(`WhatsApp phone: ${organization.whatsappPhoneNumber}`);
    logger.info(`Slug: ${organization.slug}`);

    // Also create an admin user for this organization
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('Test123!', 10);

    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@test-whatsapp-clinic.com',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'Admin',
        role: 'ADMIN',
        organizationId: organization.id,
        emailVerified: true,
        isActive: true,
      },
    });

    logger.info(`Admin user created: ${adminUser.email}`);
    logger.info('Password: Test123!');

    // Create a test provider
    const providerData: any = {
      firstName: 'Dr. Test',
      lastName: 'Provider',
      email: 'provider@test-clinic.com',
      phone: '+923001111112',
      specialization: 'General Medicine',
      qualifications: ['MBBS'],
      organizationId: organization.id,
      isActive: true,
      availableDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      workingHours: {
        start: '09:00',
        end: '17:00',
      },
    };
    const provider = await prisma.provider.create({ data: providerData });

    logger.info(`Test provider created: Dr. ${provider.firstName} ${provider.lastName}`);

    // Create a test patient
    const patient = await prisma.patient.create({
      data: {
        firstName: 'Test',
        lastName: 'Patient',
        email: 'patient@test.com',
        phone: '+923009999888', // This is the patient's phone for testing
        dateOfBirth: new Date('1990-01-01'),
        gender: 'MALE',
        address: 'Test Patient Address',
        organizationId: organization.id,
        isActive: true,
      },
    });

    logger.info(`Test patient created: ${patient.firstName} ${patient.lastName}`);
    logger.info(`Patient phone: ${patient.phone}`);

    console.log('\n' + '='.repeat(70));
    console.log('✅ TEST ORGANIZATION SETUP COMPLETE');
    console.log('='.repeat(70));
    console.log('\nTest Details:');
    console.log(`  Organization ID: ${organization.id}`);
    console.log(`  Organization Name: ${organization.name}`);
    console.log(`  WhatsApp Phone: ${organization.whatsappPhoneNumber}`);
    console.log(`  Phone Number ID: ${whatsappCredentials.phoneNumberId}`);
    console.log('\nTest Users:');
    console.log(`  Admin: ${adminUser.email} / Test123!`);
    console.log(`  Provider: Dr. ${provider.firstName} ${provider.lastName}`);
    console.log(`  Patient: ${patient.firstName} ${patient.lastName} (${patient.phone})`);
    console.log('\nReady for Testing:');
    console.log('  1. WhatsApp mock server is at http://localhost:3099');
    console.log('  2. Backend is at http://localhost:3001');
    console.log('  3. Use patient phone (+923009999888) to send test messages');
    console.log('  4. Messages will route to organization: ' + organization.id);
    console.log('='.repeat(70) + '\n');

    return {
      organization,
      adminUser,
      provider,
      patient,
    };

  } catch (error) {
    logger.error('Error setting up test organization:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  setupTestOrganization()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to setup test organization:', error);
      process.exit(1);
    });
}

export { setupTestOrganization };
