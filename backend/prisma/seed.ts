import { PrismaClient } from '../src/generated/prisma';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create organizations
  const organization = await prisma.organization.upsert({
    where: { email: 'admin@drsync.com' },
    update: {},
    create: {
      name: 'DrSync Medical Center',
      slug: 'drsync-medical-center',
      email: 'admin@drsync.com',
      phone: '+1-555-DRSYNC',
      address: '123 Healthcare Ave, Medical District, City, State 12345',
      timezone: 'UTC',
      isActive: true
    }
  });

  console.log('✓ Created organization:', organization.name);

  // Create users with different roles
  const hashedPassword = await bcrypt.hash('password123', 10);

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@drsync.com' },
      update: {},
      create: {
        email: 'admin@drsync.com',
        password: hashedPassword,
        firstName: 'System',
        lastName: 'Administrator',
        role: 'SUPER_ADMIN',
        phone: '+1-555-001-0001',
        organizationId: organization.id,
        isActive: true,
        emailVerified: true
      }
    }),

    prisma.user.upsert({
      where: { email: 'manager@drsync.com' },
      update: {},
      create: {
        email: 'manager@drsync.com',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Manager',
        role: 'ORG_ADMIN',
        phone: '+1-555-001-0002',
        organizationId: organization.id,
        isActive: true,
        emailVerified: true
      }
    }),

    prisma.user.upsert({
      where: { email: 'doctor@drsync.com' },
      update: {},
      create: {
        email: 'doctor@drsync.com',
        password: hashedPassword,
        firstName: 'Dr. Sarah',
        lastName: 'Wilson',
        role: 'DOCTOR',
        phone: '+1-555-001-0003',
        organizationId: organization.id,
        isActive: true,
        emailVerified: true
      }
    }),

    prisma.user.upsert({
      where: { email: 'receptionist@drsync.com' },
      update: {},
      create: {
        email: 'receptionist@drsync.com',
        password: hashedPassword,
        firstName: 'Mary',
        lastName: 'Johnson',
        role: 'STAFF',
        phone: '+1-555-001-0004',
        organizationId: organization.id,
        isActive: true,
        emailVerified: true
      }
    })
  ]);

  console.log('✓ Created users:', users.map(u => u.email).join(', '));

  // Create providers
  const providers = await Promise.all([
    prisma.provider.upsert({
      where: { id: 'provider-1' },
      update: {},
      create: {
        id: 'provider-1',
        firstName: 'Dr. Sarah',
        lastName: 'Wilson',
        title: 'MD',
        specialization: 'General Medicine',
        licenseNumber: 'MD123456',
        email: 'doctor@drsync.com',
        phone: '+1-555-001-0003',
        experience: 8,
        qualifications: ['MD - Harvard Medical School', 'Residency - Johns Hopkins'],
        biography: 'Dr. Wilson is a dedicated family physician with over 8 years of experience providing comprehensive healthcare services.',
        consultationDuration: 30,
        consultationFee: 150.00,
        currency: 'USD',
        workingHours: {
          monday: ['09:00-17:00'],
          tuesday: ['09:00-17:00'],
          wednesday: ['09:00-17:00'],
          thursday: ['09:00-17:00'],
          friday: ['09:00-17:00']
        },
        organizationId: organization.id,
        isActive: true
      }
    }),

    prisma.provider.upsert({
      where: { id: 'provider-2' },
      update: {},
      create: {
        id: 'provider-2',
        firstName: 'Dr. Michael',
        lastName: 'Chen',
        title: 'MD, PhD',
        specialization: 'Cardiology',
        licenseNumber: 'MD789012',
        email: 'cardio@drsync.com',
        phone: '+1-555-001-0005',
        experience: 12,
        qualifications: ['MD - Stanford Medical School', 'PhD - Cardiovascular Research', 'Fellowship - Mayo Clinic'],
        biography: 'Dr. Chen is a board-certified cardiologist specializing in preventive cardiology and heart disease management.',
        consultationDuration: 45,
        consultationFee: 250.00,
        currency: 'USD',
        workingHours: {
          monday: ['08:00-16:00'],
          tuesday: ['08:00-16:00'],
          wednesday: ['08:00-16:00'],
          thursday: ['08:00-16:00'],
          friday: ['08:00-12:00']
        },
        organizationId: organization.id,
        isActive: true
      }
    })
  ]);

  console.log('✓ Created providers:', providers.map(p => `${p.firstName} ${p.lastName}`).join(', '));

  // Create patients
  const patients = await Promise.all([
    prisma.patient.upsert({
      where: { id: 'patient-1' },
      update: {},
      create: {
        id: 'patient-1',
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice@example.com',
        phone: '+1-555-100-0001',
        dateOfBirth: new Date('1985-06-15'),
        gender: 'FEMALE',
        address: '456 Oak Street, Suburb, City, State 12345',
        emergencyContact: 'Bob Johnson (+1-555-100-0002)',
        organizationId: organization.id,
        isActive: true
      }
    }),

    prisma.patient.upsert({
      where: { id: 'patient-2' },
      update: {},
      create: {
        id: 'patient-2',
        firstName: 'Robert',
        lastName: 'Smith',
        email: 'robert@example.com',
        phone: '+1-555-100-0003',
        dateOfBirth: new Date('1978-03-22'),
        gender: 'MALE',
        address: '789 Pine Avenue, Downtown, City, State 12345',
        emergencyContact: 'Lisa Smith (+1-555-100-0004)',
        organizationId: organization.id,
        isActive: true
      }
    })
  ]);

  console.log('✓ Created patients:', patients.map(p => `${p.firstName} ${p.lastName}`).join(', '));

  // Create appointments
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(14, 0, 0, 0);

  const appointments = await Promise.all([
    prisma.appointment.upsert({
      where: { id: 'appointment-1' },
      update: {},
      create: {
        id: 'appointment-1',
        patientId: patients[0].id,
        providerId: providers[0].id,
        scheduledAt: tomorrow,
        duration: 30,
        endTime: new Date(tomorrow.getTime() + 30 * 60 * 1000),
        status: 'SCHEDULED',
        description: 'Annual check-up - Regular annual health examination',
        organizationId: organization.id
      }
    }),

    prisma.appointment.upsert({
      where: { id: 'appointment-2' },
      update: {},
      create: {
        id: 'appointment-2',
        patientId: patients[1].id,
        providerId: providers[1].id,
        scheduledAt: nextWeek,
        duration: 45,
        endTime: new Date(nextWeek.getTime() + 45 * 60 * 1000),
        status: 'SCHEDULED',
        description: 'Cardiology follow-up - Follow-up appointment for blood pressure monitoring',
        organizationId: organization.id
      }
    })
  ]);

  console.log('✓ Created appointments:', appointments.length);

  console.log('🎉 Database seeding completed successfully!');
  console.log('');
  console.log('Test credentials:');
  console.log('- Super Admin: admin@drsync.com / password123');
  console.log('- Admin: manager@drsync.com / password123');
  console.log('- Provider: doctor@drsync.com / password123');
  console.log('- Staff: receptionist@drsync.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
