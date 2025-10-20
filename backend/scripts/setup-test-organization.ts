/**
 * Setup Test Organization with WhatsApp Credentials
 * 
 * Creates a test organization with:
 * - Admin user
 * - WhatsApp credentials (mock)
 * - Test provider
 * - Test patient
 * 
 * Used for TASK-040 WhatsApp message processing testing
 */

import { PrismaClient, SubscriptionPlan, SubscriptionStatus, UserRole, OrganizationType, Gender } from '../src/generated/prisma';
import { encryptData } from '../src/utils/encryption';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Setting up test organization for WhatsApp testing...\n');

  const testOrgEmail = 'test-whatsapp-org@drsync.dev';
  const testOrgPhone = '+923001111111';
  const testPhoneNumberId = 'test123456789012345';
  
  // Check if organization already exists
  let organization = await prisma.organization.findUnique({
    where: { email: testOrgEmail },
  });

  if (organization) {
    console.log('✓ Test organization already exists');
    console.log(`  ID: ${organization.id}`);
    console.log(`  Name: ${organization.name}\n`);
  } else {
    // Create test organization
    console.log('Creating test organization...');
    
    // Mock WhatsApp credentials (for simulator)
    const whatsappCredentials = {
      accessToken: 'test-access-token-12345',
      phoneNumberId: testPhoneNumberId,
      businessAccountId: 'test-business-account-123',
      webhookVerifyToken: 'test-webhook-verify-token',
      appSecret: 'test-app-secret',
    };

    // Encrypt credentials
    const encryptedCredentials = encryptData(JSON.stringify(whatsappCredentials));

    organization = await prisma.organization.create({
      data: {
        name: 'Test WhatsApp Clinic',
        email: testOrgEmail,
        phone: testOrgPhone,
        address: 'Test Address, Karachi, Pakistan',
        slug: 'test-whatsapp-clinic',
        organizationType: OrganizationType.CLINIC,
        subscriptionPlan: SubscriptionPlan.FREE,
        subscriptionStatus: SubscriptionStatus.TRIAL,
        subscriptionEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        isActive: true,
        whatsappConfigured: true,
        whatsappPhoneVerified: true,
        whatsappPhoneNumber: testOrgPhone,
        whatsappCredentials: encryptedCredentials as any,
      },
    });

    console.log('✓ Test organization created');
    console.log(`  ID: ${organization.id}`);
    console.log(`  Name: ${organization.name}`);
    console.log(`  Phone: ${organization.whatsappPhoneNumber}\n`);
  }

  // Create admin user if doesn't exist
  const testUserEmail = 'admin@test-whatsapp-org.drsync.dev';
  let adminUser = await prisma.user.findUnique({
    where: { email: testUserEmail },
  });

  if (!adminUser) {
    console.log('Creating admin user...');
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);

    adminUser = await prisma.user.create({
      data: {
        email: testUserEmail,
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'Admin',
        role: UserRole.ADMIN,
        organizationId: organization.id,
        emailVerified: true,
        isActive: true,
      },
    });

    console.log('✓ Admin user created');
    console.log(`  Email: ${adminUser.email}`);
    console.log(`  Password: TestPassword123!\n`);
  } else {
    console.log('✓ Admin user already exists\n');
  }

  // Create test provider if doesn't exist
  const testProviders = await prisma.provider.findMany({
    where: {
      organizationId: organization.id,
      email: 'dr.test@whatsapp-clinic.com',
    },
  });

  let provider;
  if (testProviders.length === 0) {
    console.log('Creating test provider...');
    provider = await prisma.provider.create({
      data: {
        firstName: 'Dr. Ahmed',
        lastName: 'Khan',
        email: 'dr.test@whatsapp-clinic.com',
        phone: '+923001112222',
        specialization: 'General Physician',
        organizationId: organization.id,
        isActive: true,
      },
    });

    console.log('✓ Test provider created');
    console.log(`  Name: Dr. ${provider.firstName} ${provider.lastName}`);
    console.log(`  Phone: ${provider.phone}\n`);
  } else {
    provider = testProviders[0];
    console.log('✓ Test provider already exists\n');
  }

  // Create test patient if doesn't exist
  const testPatientPhone = '+923009999888';
  const testPatients = await prisma.patient.findMany({
    where: {
      organizationId: organization.id,
      phone: testPatientPhone,
    },
  });

  if (testPatients.length === 0) {
    console.log('Creating test patient...');
    const patient = await prisma.patient.create({
      data: {
        firstName: 'Ali',
        lastName: 'Hassan',
        phone: testPatientPhone,
        email: 'ali.hassan@example.com',
        dateOfBirth: new Date('1990-01-15'),
        gender: Gender.MALE,
        address: 'Test Address, Karachi',
        organizationId: organization.id,
      },
    });

    console.log('✓ Test patient created');
    console.log(`  Name: ${patient.firstName} ${patient.lastName}`);
    console.log(`  Phone: ${patient.phone}\n`);
  } else {
    console.log('✓ Test patient already exists\n');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Test organization setup complete!\n');
  console.log('Test Configuration:');
  console.log(`  Organization ID: ${organization.id}`);
  console.log(`  WhatsApp Phone: ${testOrgPhone}`);
  console.log(`  Phone Number ID: ${testPhoneNumberId}`);
  console.log(`  Patient Phone: ${testPatientPhone}`);
  console.log('\nYou can now test WhatsApp messaging with:');
  console.log(`  npm run whatsapp:simulate`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((error) => {
    console.error('❌ Error setting up test organization:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
