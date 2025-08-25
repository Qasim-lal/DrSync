import { getPrismaClient } from '../src/services/prisma';
import { authService } from '../src/services/auth';
import { logger } from '../src/utils/logger';

const prisma = getPrismaClient();

// Test organizations data
const testOrganizations = [
  {
    id: 'test-org-healthcare-1',
    name: 'DrSync Test Hospital',
    slug: 'drsync-test-hospital',
    address: '123 Healthcare Ave, Medical City, MC 12345',
    phone: '+1-555-0100',
    email: 'admin@drsynctesthospital.com',
    website: 'https://drsynctesthospital.com',
    isActive: true,
  },
  {
    id: 'test-org-clinic-2', 
    name: 'Family Care Clinic',
    slug: 'family-care-clinic',
    address: '456 Wellness St, Health Town, HT 54321',
    phone: '+1-555-0200',
    email: 'info@familyclinic.com',
    website: 'https://familyclinic.com',
    isActive: true,
  }
];

// Test users with different roles for comprehensive RBAC testing
const testUsers = [
  // Super Admin - can access everything across all organizations
  {
    id: 'rbac-super-admin-1',
    email: 'superadmin@drsync.com',
    password: 'SuperSecure2024!',
    firstName: 'System',
    lastName: 'Administrator',
    role: 'SUPER_ADMIN',
    organizationId: 'test-org-healthcare-1',
    isActive: true,
    emailVerified: true,
  },
  
  // Organization Admins - can manage users within their organization
  {
    id: 'rbac-org-admin-hosp-1',
    email: 'admin@drsynctesthospital.com',
    password: 'HospitalAdmin2024!',
    firstName: 'Hospital',
    lastName: 'Administrator',
    role: 'ORG_ADMIN',
    organizationId: 'test-org-healthcare-1',
    isActive: true,
    emailVerified: true,
  },
  {
    id: 'rbac-org-admin-clinic-2',
    email: 'admin@familyclinic.com',
    password: 'ClinicAdmin2024!',
    firstName: 'Clinic',
    lastName: 'Manager',
    role: 'ORG_ADMIN',
    organizationId: 'test-org-clinic-2',
    isActive: true,
    emailVerified: true,
  },
  
  // Doctors - can access patient records, manage appointments
  {
    id: 'rbac-doctor-hosp-1',
    email: 'dr.smith@drsynctesthospital.com',
    password: 'Doctor2024!',
    firstName: 'Dr. John',
    lastName: 'Smith',
    role: 'DOCTOR',
    organizationId: 'test-org-healthcare-1',
    isActive: true,
    emailVerified: true,
  },
  {
    id: 'rbac-doctor-clinic-2',
    email: 'dr.johnson@familyclinic.com',
    password: 'Doctor2024!',
    firstName: 'Dr. Sarah',
    lastName: 'Johnson',
    role: 'DOCTOR',
    organizationId: 'test-org-clinic-2',
    isActive: true,
    emailVerified: true,
  },
  
  // Nurses - can view patient info, update records
  {
    id: 'rbac-nurse-hosp-1',
    email: 'nurse.wilson@drsynctesthospital.com',
    password: 'Nurse2024!',
    firstName: 'Mary',
    lastName: 'Wilson',
    role: 'NURSE',
    organizationId: 'test-org-healthcare-1',
    isActive: true,
    emailVerified: true,
  },
  {
    id: 'rbac-nurse-clinic-2',
    email: 'nurse.davis@familyclinic.com',
    password: 'Nurse2024!',
    firstName: 'Jennifer',
    lastName: 'Davis',
    role: 'NURSE',
    organizationId: 'test-org-clinic-2',
    isActive: true,
    emailVerified: true,
  },
  
  // Receptionists - can manage appointments, basic patient info
  {
    id: 'rbac-reception-hosp-1',
    email: 'reception@drsynctesthospital.com',
    password: 'Reception2024!',
    firstName: 'Lisa',
    lastName: 'Brown',
    role: 'RECEPTIONIST',
    organizationId: 'test-org-healthcare-1',
    isActive: true,
    emailVerified: true,
  },
  {
    id: 'rbac-reception-clinic-2',
    email: 'front.desk@familyclinic.com',
    password: 'Reception2024!',
    firstName: 'Amanda',
    lastName: 'Lee',
    role: 'RECEPTIONIST',
    organizationId: 'test-org-clinic-2',
    isActive: true,
    emailVerified: true,
  },
  
  // Staff - basic access level
  {
    id: 'rbac-staff-hosp-1',
    email: 'staff@drsynctesthospital.com',
    password: 'Staff2024!',
    firstName: 'Mike',
    lastName: 'Taylor',
    role: 'STAFF',
    organizationId: 'test-org-healthcare-1',
    isActive: true,
    emailVerified: true,
  },
  {
    id: 'rbac-staff-clinic-2',
    email: 'support@familyclinic.com',
    password: 'Staff2024!',
    firstName: 'Emma',
    lastName: 'Garcia',
    role: 'STAFF',
    organizationId: 'test-org-clinic-2',
    isActive: true,
    emailVerified: true,
  }
];

async function seedRBACTestData() {
  try {
    logger.info('🌱 Starting RBAC test data seeding...');

    // Clean up existing test data first
    logger.info('🧹 Cleaning up existing test data...');
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: 'drsync' } },
          { email: { contains: 'familyclinic' } },
          { id: { startsWith: 'rbac-' } }
        ]
      }
    });
    
    await prisma.organization.deleteMany({
      where: {
        OR: [
          { slug: { startsWith: 'test-' } },
          { id: { startsWith: 'test-org-' } }
        ]
      }
    });

    // Create test organizations
    logger.info('🏥 Creating test organizations...');
    for (const org of testOrganizations) {
      await prisma.organization.create({
        data: org
      });
      logger.info(`✅ Created organization: ${org.name} (${org.slug})`);
    }

    // Create test users with properly hashed passwords
    logger.info('👥 Creating test users...');
    for (const user of testUsers) {
      const hashedPassword = await authService.hashPassword(user.password);
      await prisma.user.create({
        data: {
          ...user,
          role: user.role as any, // Cast to UserRole enum
          password: hashedPassword,
        }
      });
      logger.info(`✅ Created user: ${user.firstName} ${user.lastName} (${user.role}) - ${user.email}`);
    }

    logger.info('🎉 RBAC test data seeding completed successfully!');
    
    // Display test credentials for manual testing
    console.log('\n' + '='.repeat(80));
    console.log('🔐 TEST CREDENTIALS FOR MANUAL RBAC TESTING');
    console.log('='.repeat(80));
    
    const organizationGroups = {
      'DrSync Test Hospital (test-org-healthcare-1)': testUsers.filter(u => u.organizationId === 'test-org-healthcare-1'),
      'Family Care Clinic (test-org-clinic-2)': testUsers.filter(u => u.organizationId === 'test-org-clinic-2')
    };
    
    Object.entries(organizationGroups).forEach(([orgName, users]) => {
      console.log(`\n📋 ${orgName}:`);
      console.log('-'.repeat(50));
      users.forEach(user => {
        console.log(`${user.role.padEnd(15)} | ${user.email.padEnd(35)} | ${user.password}`);
      });
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('🧪 SUGGESTED TESTING SCENARIOS:');
    console.log('='.repeat(80));
    console.log('1. Login as different roles and test endpoint access');
    console.log('2. Try cross-organization access (should be blocked)');
    console.log('3. Test role hierarchy (higher roles accessing lower-level endpoints)');
    console.log('4. Verify organization-scoped authorization works correctly');
    console.log('5. Test resource-level access control (own vs others\' data)');
    console.log('='.repeat(80));
    
  } catch (error) {
    logger.error('❌ Error seeding RBAC test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Helper function to generate JWT tokens for testing
async function generateTestTokens() {
  try {
    logger.info('🎫 Generating test JWT tokens...');
    
    const tokens: Record<string, any> = {};
    
    for (const userData of testUsers) {
      const user = await prisma.user.findUnique({
        where: { email: userData.email },
        include: { organization: true }
      });
      
      if (user) {
        const tokenPair = authService.generateTokenPair(user);
        tokens[`${user.role}_${user.organizationId}`] = {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            organization: user.organization?.name
          },
          accessToken: tokenPair.accessToken,
          refreshToken: tokenPair.refreshToken
        };
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('🎫 JWT TOKENS FOR API TESTING');
    console.log('='.repeat(80));
    console.log(JSON.stringify(tokens, null, 2));
    console.log('='.repeat(80));
    
    return tokens;
    
  } catch (error) {
    logger.error('❌ Error generating test tokens:', error);
    throw error;
  }
}

// Helper function to verify permissions
async function verifyRBACSetup() {
  try {
    logger.info('🔍 Verifying RBAC setup...');
    
    const organizationCount = await prisma.organization.count({
      where: {
        id: { startsWith: 'test-org-' }
      }
    });
    
    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      where: {
        id: { startsWith: 'rbac-' }
      },
      _count: true
    });
    
    console.log('\n📊 RBAC Setup Verification:');
    console.log(`   Organizations created: ${organizationCount}`);
    usersByRole.forEach((group: any) => {
      console.log(`   ${group.role} users: ${group._count}`);
    });
    
    // Test permission hierarchy
    const testCases = [
      { role: 'SUPER_ADMIN', requiredRoles: ['STAFF'], expected: true },
      { role: 'ORG_ADMIN', requiredRoles: ['DOCTOR'], expected: true },
      { role: 'DOCTOR', requiredRoles: ['ORG_ADMIN'], expected: false },
      { role: 'STAFF', requiredRoles: ['DOCTOR'], expected: false },
    ];
    
    console.log('\n🧪 Permission Hierarchy Tests:');
    testCases.forEach(test => {
      const result = authService.hasPermission(test.role, test.requiredRoles);
      const status = result === test.expected ? '✅' : '❌';
      console.log(`   ${status} ${test.role} accessing ${test.requiredRoles.join(', ')}: ${result}`);
    });
    
    logger.info('✅ RBAC setup verification completed!');
    
  } catch (error) {
    logger.error('❌ Error verifying RBAC setup:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'seed':
      seedRBACTestData();
      break;
    case 'tokens':
      generateTestTokens();
      break;
    case 'verify':
      verifyRBACSetup();
      break;
    default:
      console.log('Usage: ts-node scripts/seed-rbac-test-data.ts [seed|tokens|verify]');
      console.log('  seed   - Create test organizations and users');
      console.log('  tokens - Generate JWT tokens for all test users');  
      console.log('  verify - Verify the RBAC setup is working correctly');
      break;
  }
}

export { seedRBACTestData, generateTestTokens, verifyRBACSetup };
