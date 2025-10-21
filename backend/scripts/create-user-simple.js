const { PrismaClient } = require('../src/generated/prisma');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Delete existing
  await prisma.user.deleteMany({ where: { email: 'test@phase2clinic.com' } });
  
  // Hash password
  const password = await bcrypt.hash('test123', 12);
  
  // Create user
  const user = await prisma.user.create({
    data: {
      id: 'test-user-phase2',
      email: 'test@phase2clinic.com',
      password,
      firstName: 'Test',
      lastName: 'User',
      role: 'ORG_ADMIN',
      organizationId: 'test-org-phase2-settings',
      isActive: true,
      emailVerified: true
    }
  });
  
  console.log('✅ User created:', user.email, user.role);
}

main().catch(e => console.error('Error:', e.message)).finally(() => prisma.$disconnect());
