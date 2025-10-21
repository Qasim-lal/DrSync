const { PrismaClient } = require('../src/generated/prisma');

const prisma = new PrismaClient();

async function main() {
  const superAdmins = await prisma.user.findMany({
    where: { role: 'SUPER_ADMIN' },
    select: {
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true
    }
  });
  
  console.log('\n🔐 Super Admin Users:\n');
  if (superAdmins.length === 0) {
    console.log('No super admin users found.');
  } else {
    superAdmins.forEach(user => {
      console.log(`📧 Email: ${user.email}`);
      console.log(`👤 Name: ${user.firstName} ${user.lastName}`);
      console.log(`✅ Active: ${user.isActive}`);
      console.log('---');
    });
  }
  
  console.log('\nNote: Passwords are hashed and cannot be retrieved.');
  console.log('Common test password is usually: admin123 or test123\n');
}

main()
  .catch(e => console.error('Error:', e.message))
  .finally(() => prisma.$disconnect());
