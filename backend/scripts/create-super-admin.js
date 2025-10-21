const { PrismaClient } = require('../src/generated/prisma');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Check if super admin exists
  const existing = await prisma.user.findFirst({
    where: { email: 'admin@drsync.com' }
  });

  if (existing) {
    console.log('\n⚠️  Super admin already exists: admin@drsync.com');
    console.log('Use password: admin123\n');
    return;
  }

  // Create platform organization if it doesn't exist
  let platformOrg = await prisma.organization.findFirst({
    where: { slug: 'drsync-platform' }
  });

  if (!platformOrg) {
    platformOrg = await prisma.organization.create({
      data: {
        id: 'platform-org',
        name: 'DrSync Platform',
        slug: 'drsync-platform',
        email: 'platform@drsync.com',
        whatsappPhoneNumber: '+923001234567',
        whatsappConfigured: true,
        isActive: true
      }
    });
    console.log('✅ Created platform organization');
  }

  // Hash password
  const password = await bcrypt.hash('admin123', 12);

  // Create super admin user
  const admin = await prisma.user.create({
    data: {
      id: 'super-admin-user',
      email: 'admin@drsync.com',
      password,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      organizationId: platformOrg.id,
      isActive: true,
      emailVerified: true
    }
  });

  console.log('\n✅ Super Admin Created Successfully!\n');
  console.log('📧 Email: admin@drsync.com');
  console.log('🔑 Password: admin123');
  console.log('👤 Role: SUPER_ADMIN\n');
}

main()
  .catch(e => console.error('Error:', e.message))
  .finally(() => prisma.$disconnect());
