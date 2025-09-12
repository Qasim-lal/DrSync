import { Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '../generated/prisma';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

// Validation schemas
const createPatientSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number'),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(100).optional().default('Pakistan'),
  bloodGroup: z.enum(['A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE']).optional(),
  allergies: z.string().max(500).optional(),
  medicalHistory: z.string().max(2000).optional(),
  emergencyContact: z.string().max(100).optional(),
  whatsappNumber: z.string().max(20).optional(),
  preferredLanguage: z.enum(['en', 'ur']).optional().default('en'),
  primaryContact: z.boolean().optional().default(true),
  relationToPrimaryContact: z.string().max(50).optional()
});

const updatePatientSchema = createPatientSchema.partial();

const querySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20'),
  search: z.string().optional(),
  sortBy: z.enum(['firstName', 'lastName', 'createdAt', 'dateOfBirth']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

export class PatientController {
  /**
   * GET /api/patients - Get patients list with pagination and search
   * Roles: STAFF+, NURSE+, DOCTOR+, ORG_ADMIN+, SUPER_ADMIN
   */
  async getPatients(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { page, limit, search, sortBy, sortOrder } = querySchema.parse(req.query);
      const skip = (page - 1) * limit;

      // Build where clause for search and organization filtering
      const where: any = {
        organizationId: req.user!.organizationId // Organization-scoped
      };

      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } }
        ];
      }

      // Execute queries in parallel
      const [patients, total] = await Promise.all([
        prisma.patient.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            dateOfBirth: true,
            gender: true,
            address: true,
            city: true,
            state: true,
            postalCode: true,
            country: true,
            emergencyContact: true,
            whatsappNumber: true,
            preferredLanguage: true,
            bloodGroup: true,
            createdAt: true,
            updatedAt: true,
            // Sensitive fields only for DOCTOR+ roles
            ...(req.user!.role === 'DOCTOR' || req.user!.role === 'ORG_ADMIN' || req.user!.role === 'SUPER_ADMIN' ? {
              medicalHistory: true,
              allergies: true
            } : {})
          }
        }),
        prisma.patient.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: {
          patients,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: error.errors
        });
        return;
      }

      console.error('Error fetching patients:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * GET /api/patients/:id - Get single patient
   * Roles: STAFF+, NURSE+, DOCTOR+, ORG_ADMIN+, SUPER_ADMIN
   */
  async getPatient(req: AuthRequest, res: Response): Promise<void> {
    try {
      const patientId = req.params.id;

      if (!patientId) {
        res.status(400).json({
          success: false,
          message: 'Patient ID is required'
        });
        return;
      }

      const patient = await prisma.patient.findFirst({
        where: {
          id: patientId,
          organizationId: req.user!.organizationId // Organization-scoped
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          dateOfBirth: true,
          gender: true,
          address: true,
          city: true,
          state: true,
          postalCode: true,
          country: true,
          emergencyContact: true,
          whatsappNumber: true,
          preferredLanguage: true,
          bloodGroup: true,
          createdAt: true,
          updatedAt: true,
          // Sensitive fields only for DOCTOR+ roles
          ...(req.user!.role === 'DOCTOR' || req.user!.role === 'ORG_ADMIN' || req.user!.role === 'SUPER_ADMIN' ? {
            medicalHistory: true,
            allergies: true
          } : {})
        }
      });

      if (!patient) {
        res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
        return;
      }

      res.json({
        success: true,
        data: { patient }
      });
    } catch (error) {
      console.error('Error fetching patient:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * POST /api/patients - Create new patient
   * Roles: NURSE+, DOCTOR+, ORG_ADMIN+, SUPER_ADMIN
   */
  async createPatient(req: AuthRequest, res: Response): Promise<void> {
    try {
      const validatedData = createPatientSchema.parse(req.body);

      // Check for existing patients with this phone number (family support)
      const existingPatients = await prisma.patient.findMany({
        where: {
          phone: validatedData.phone,
          organizationId: req.user!.organizationId
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          primaryContact: true,
          relationToPrimaryContact: true
        }
      });

      // If patients exist with this phone, this is a family member
      const isNewFamilyMember = existingPatients.length > 0;

      // Check for duplicate email if provided
      if (validatedData.email) {
        const existingEmail = await prisma.patient.findFirst({
          where: {
            email: validatedData.email,
            organizationId: req.user!.organizationId
          }
        });

        if (existingEmail) {
          res.status(409).json({
            success: false,
            message: 'Patient with this email already exists in your organization'
          });
          return;
        }
      }

      // Validate date of birth if provided (not in future, reasonable age range)
      if (validatedData.dateOfBirth) {
        const dob = new Date(validatedData.dateOfBirth);
        const today = new Date();
        const age = today.getFullYear() - dob.getFullYear();

        if (dob > today) {
          res.status(400).json({
            success: false,
            message: 'Date of birth cannot be in the future'
          });
          return;
        }

        if (age > 150) {
          res.status(400).json({
            success: false,
            message: 'Invalid date of birth'
          });
          return;
        }
      }

      // Remove undefined values and convert types to satisfy strict typing
      const createData: any = {};
      Object.keys(validatedData).forEach(key => {
        const value = (validatedData as any)[key];
        if (value !== undefined) {
          // Convert dateOfBirth string to Date object
          if (key === 'dateOfBirth') {
            createData[key] = new Date(value);
          } else {
            createData[key] = value;
          }
        }
      });
      createData.organizationId = req.user!.organizationId;

      // Handle family member logic
      if (isNewFamilyMember) {
        // If this is a family member, set primaryContact to false unless explicitly specified
        if (createData.primaryContact === undefined) {
          createData.primaryContact = false;
        }
        
        // Set default relation if not provided
        if (!createData.relationToPrimaryContact) {
          createData.relationToPrimaryContact = 'family_member';
        }
        
        // Log family member creation
        console.log(`Creating family member for phone ${validatedData.phone}: ${createData.firstName} ${createData.lastName}`);
      }

      const patient = await prisma.patient.create({
        data: createData,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          dateOfBirth: true,
          gender: true,
          address: true,
          city: true,
          state: true,
          postalCode: true,
          country: true,
          emergencyContact: true,
          whatsappNumber: true,
          preferredLanguage: true,
          bloodGroup: true,
          createdAt: true
        }
      });

      res.status(201).json({
        success: true,
        message: 'Patient created successfully',
        data: { patient }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid patient data',
          errors: error.errors
        });
        return;
      }

      console.error('Error creating patient:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * PUT /api/patients/:id - Update patient
   * Roles: NURSE+, DOCTOR+, ORG_ADMIN+, SUPER_ADMIN
   */
  async updatePatient(req: AuthRequest, res: Response): Promise<void> {
    try {
      const patientId = req.params.id;
      const validatedData = updatePatientSchema.parse(req.body);

      if (!patientId) {
        res.status(400).json({
          success: false,
          message: 'Patient ID is required'
        });
        return;
      }

      // Check if patient exists and belongs to user's organization
      const existingPatient = await prisma.patient.findFirst({
        where: {
          id: patientId,
          organizationId: req.user!.organizationId
        }
      });

      if (!existingPatient) {
        res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
        return;
      }

      // Note: Multiple patients can share the same phone number (family members)

      // Check for duplicate email if email is being updated
      if (validatedData.email && validatedData.email !== existingPatient.email) {
        const duplicateEmail = await prisma.patient.findFirst({
          where: {
            email: validatedData.email,
            organizationId: req.user!.organizationId,
            NOT: { phone: existingPatient.phone }
          }
        });

        if (duplicateEmail) {
          res.status(409).json({
            success: false,
            message: 'Another patient with this email already exists'
          });
          return;
        }
      }

      // Validate date of birth if being updated
      if (validatedData.dateOfBirth) {
        const dob = new Date(validatedData.dateOfBirth);
        const today = new Date();
        const age = today.getFullYear() - dob.getFullYear();

        if (dob > today || age > 150) {
          res.status(400).json({
            success: false,
            message: 'Invalid date of birth'
          });
          return;
        }
      }

      // Remove undefined values and convert types to satisfy strict typing
      const updateData: any = { updatedAt: new Date() };
      Object.keys(validatedData).forEach(key => {
        const value = (validatedData as any)[key];
        if (value !== undefined) {
          // Convert dateOfBirth string to Date object
          if (key === 'dateOfBirth') {
            updateData[key] = new Date(value);
          } else {
            updateData[key] = value;
          }
        }
      });

      const updatedPatient = await prisma.patient.update({
        where: { phone: existingPatient.phone },
        data: updateData,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          dateOfBirth: true,
          gender: true,
          address: true,
          city: true,
          state: true,
          postalCode: true,
          country: true,
          emergencyContact: true,
          whatsappNumber: true,
          preferredLanguage: true,
          bloodGroup: true,
          updatedAt: true
        }
      });

      res.json({
        success: true,
        message: 'Patient updated successfully',
        data: { patient: updatedPatient }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid patient data',
          errors: error.errors
        });
        return;
      }

      console.error('Error updating patient:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * DELETE /api/patients/:id - Delete patient
   * Roles: ORG_ADMIN+, SUPER_ADMIN
   */
  async deletePatient(req: AuthRequest, res: Response): Promise<void> {
    try {
      const patientId = req.params.id;

      if (!patientId) {
        res.status(400).json({
          success: false,
          message: 'Patient ID is required'
        });
        return;
      }

      // Check if patient exists and belongs to user's organization
      const existingPatient = await prisma.patient.findFirst({
        where: {
          id: patientId,
          organizationId: req.user!.organizationId
        }
      });

      if (!existingPatient) {
        res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
        return;
      }

      // Check if patient has appointments (prevent deletion if they do)
      const appointmentCount = await prisma.appointment.count({
        where: { patientId: existingPatient.id }
      });

      if (appointmentCount > 0) {
        res.status(409).json({
          success: false,
          message: 'Cannot delete patient with existing appointments. Cancel appointments first.'
        });
        return;
      }

      await prisma.patient.delete({
        where: { phone: existingPatient.phone }
      });

      res.json({
        success: true,
        message: 'Patient deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting patient:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * GET /api/patients/stats - Get patient statistics
   * Roles: DOCTOR+, ORG_ADMIN+, SUPER_ADMIN
   */
  async getPatientStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const organizationId = req.user!.organizationId;

      const [
        totalPatients,
        newPatientsThisMonth,
        genderStats,
        ageGroups
      ] = await Promise.all([
        // Total patients
        prisma.patient.count({
          where: { organizationId }
        }),

        // New patients this month
        prisma.patient.count({
          where: {
            organizationId,
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
          }
        }),

        // Gender distribution
        prisma.patient.groupBy({
          by: ['gender'],
          where: { organizationId },
          _count: true
        }),

        // Age groups (simple approach for testing)
        prisma.patient.findMany({
          where: { 
            organizationId,
            dateOfBirth: { not: null }
          },
          select: {
            dateOfBirth: true
          }
        }).then(patients => {
          const ageGroups: { [key: string]: number } = {
            'Under 18': 0,
            '18-35': 0,
            '36-55': 0,
            '56-75': 0,
            'Over 75': 0
          };
          
          const today = new Date();
          patients.forEach(patient => {
            if (patient.dateOfBirth) {
              const age = today.getFullYear() - patient.dateOfBirth.getFullYear();
              if (age < 18) {
                ageGroups['Under 18']!++;
              } else if (age <= 35) {
                ageGroups['18-35']!++;
              } else if (age <= 55) {
                ageGroups['36-55']!++;
              } else if (age <= 75) {
                ageGroups['56-75']!++;
              } else {
                ageGroups['Over 75']!++;
              }
            }
          });
          
          return Object.entries(ageGroups).map(([age_group, count]) => ({ age_group, count }));
        })
      ]);

      res.json({
        success: true,
        data: {
          totalPatients,
          newPatientsThisMonth,
          genderDistribution: genderStats.map((stat: any) => ({
            gender: stat.gender,
            count: stat._count
          })),
          ageDistribution: ageGroups
        }
      });
    } catch (error) {
      console.error('Error fetching patient stats:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

export const patientController = new PatientController();
