/**
 * Create Test User for Phase 2 Frontend Testing
 */

const { getPrismaClient } = require('../dist/services/prisma');
const bcrypt = require('bcryptjs');

const prisma = getPrismaClient();

async function createTestUser() {
  try {
    // Clean up existing test user
    await prisma.user.deleteMany({
      where: { email: 'test@phase2clinic.com' }
    });

    // Hash password
    const hashedPassword = await bcrypt.hash('test123', 12);

    // Create test user
    const user = await prisma.user.create({
      data: {
        id: 'test-user-phase2',
        email: 'test@phase2clinic.com',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        role: 'ORG_ADMIN',
        organizationId: 'test-org-phase2-settings',
        isActive: true,
        emailVerified: true
      }
    });

    console.log('\n✅ Test user created successfully!');
    console.log('Email:', user.email);
    console.log('Password: test123');
    console.log('Role:', user.role);
    console.log('Organization ID:', user.organizationId);
    console.log('\n');

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    process.exit(1);
  }
}

createTestUser();
