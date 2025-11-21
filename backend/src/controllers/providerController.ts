import { Request, Response } from 'express';
import { z } from 'zod';
import { getPrismaClient } from '../services/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import googleSheetsService from '../services/googleSheetsService';

const prisma = getPrismaClient();

// Validation schemas
const createProviderSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  title: z.string().nullable().optional(),
  specialization: z.string().min(1, 'Specialization is required').max(100),
  licenseNumber: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  experience: z.number().int().min(0).max(100).nullable().optional(),
  qualifications: z.array(z.string()).optional(),
  biography: z.string().max(1000).nullable().optional(),
  consultationDuration: z.number().int().min(15).max(480).default(30),
  consultationFee: z.number().min(0).nullable().optional(),
  currency: z.string().default('PKR'),
  workingHours: z.record(z.array(z.string())).nullable().optional(),
  isActive: z.boolean().default(true),
});

const updateProviderSchema = createProviderSchema.partial();

// GET /api/providers - Get all providers
// GOOGLE SHEETS PRIMARY: Reads from Google Sheets first, falls back to PostgreSQL
export const getProviders = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const organizationId = req.user?.organizationId;
  let dataSource = 'GOOGLE_SHEETS';
  
  if (!organizationId) {
    res.status(400).json({
      success: false,
      message: 'Organization ID is required'
    });
    return;
  }

  const {
    page = '1',
    limit = '10',
    search = '',
    specialization = '',
    isActive = ''
  } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const offset = (pageNum - 1) * limitNum;

  let providers: any[] = [];
  let totalCount = 0;

  // Try to read from Google Sheets first (PRIMARY DATA SOURCE)
  try {
    console.log(`Reading providers from Google Sheets for organization ${organizationId}`);
    
    const sheetsData = await googleSheetsService.getProviders(organizationId, {
      page: pageNum,
      limit: limitNum,
      ...(search && { search: search as string }),
      ...(specialization && { specialization: specialization as string }),
      ...(isActive === 'true' && { isActive: true }),
      ...(isActive === 'false' && { isActive: false })
    });

    providers = sheetsData.providers || [];
    totalCount = sheetsData.total || 0;
    console.log(`Successfully read ${providers.length} providers from Google Sheets`);

  } catch (error: any) {
    console.warn('Failed to read providers from Google Sheets, falling back to PostgreSQL:', error);
    dataSource = 'POSTGRESQL_FALLBACK';

    // Fallback to PostgreSQL
    const whereClause: any = {
      organizationId,
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { specialization: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(specialization && { specialization: { contains: specialization, mode: 'insensitive' } }),
      ...(isActive !== '' && { isActive: isActive === 'true' })
    };

    try {
      const [pgProviders, pgTotalCount] = await Promise.all([
        prisma.provider.findMany({
          where: whereClause,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
                isActive: true
              }
            },
            _count: {
              select: {
                appointments: true
              }
            }
          },
          orderBy: [
            { isActive: 'desc' },
            { firstName: 'asc' },
            { lastName: 'asc' }
          ],
          skip: offset,
          take: limitNum
        }),
        prisma.provider.count({ where: whereClause })
      ]);

      providers = pgProviders;
      totalCount = pgTotalCount;
      console.log(`Fallback: Read ${providers.length} providers from PostgreSQL`);
    } catch (pgError: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve providers from both data sources',
        error: pgError.message
      });
      return;
    }
  }

  res.json({
    success: true,
    dataSource, // Indicate which data source was used
    data: providers,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limitNum)
    }
  });
});

// POST /api/providers - Create new provider
export const createProvider = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const organizationId = req.user?.organizationId;
  
  if (!organizationId) {
    res.status(400).json({
      success: false,
      message: 'Organization ID is required'
    });
    return;
  }

  try {
    const validatedData = createProviderSchema.parse(req.body);

    // Check for duplicate email within organization
    if (validatedData.email) {
      const existingProvider = await prisma.provider.findFirst({
        where: {
          organizationId,
          email: validatedData.email
        }
      });

      if (existingProvider) {
        res.status(409).json({
          success: false,
          message: 'A provider with this email already exists'
        });
        return;
      }
    }

    const providerData: any = {
      ...validatedData,
      organizationId,
      title: validatedData.title || null,
      email: validatedData.email || null,
      phone: validatedData.phone || null,
      licenseNumber: validatedData.licenseNumber || null,
      experience: validatedData.experience || null,
      biography: validatedData.biography || null,
      consultationFee: validatedData.consultationFee || null,
      workingHours: validatedData.workingHours || null,
    };

    // Create provider in Google Sheets FIRST (PRIMARY DATA SOURCE)
    const sheetsProviderData = {
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      ...(validatedData.title && { title: validatedData.title }),
      specialization: validatedData.specialization,
      consultationDuration: validatedData.consultationDuration,
      ...(validatedData.consultationFee && { consultationFee: validatedData.consultationFee }),
      ...(validatedData.workingHours && { workingHours: validatedData.workingHours }),
      organizationId
    };

    const sheetsResult = await googleSheetsService.createProvider(sheetsProviderData);
    
    if (!sheetsResult.success) {
      res.status(409).json({
        success: false,
        message: sheetsResult.message || 'Failed to create provider in Google Sheets'
      });
      return;
    }

    // Background sync to PostgreSQL for system operations
    const provider = await prisma.provider.create({
      data: {
        ...providerData,
        id: sheetsResult.providerId,
        googleSheetsRowId: sheetsResult.providerId // Link to Google Sheets record
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true
          }
        },
        _count: {
          select: {
            appointments: true
          }
        }
      }
    }).catch(async (error) => {
      console.warn('PostgreSQL sync failed for provider creation, but Google Sheets write succeeded:', error);
      // Return provider data even if PostgreSQL fails (Google Sheets is primary)
      return {
        id: sheetsResult.providerId,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        title: validatedData.title,
        specialization: validatedData.specialization,
        consultationDuration: validatedData.consultationDuration,
        consultationFee: validatedData.consultationFee,
        workingHours: validatedData.workingHours,
        createdAt: new Date()
      };
    });

    res.status(201).json({
      success: true,
      message: 'Provider created successfully in Google Sheets (primary data source)',
      data: provider
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create provider',
      error: error.message
    });
  }
});

// GET /api/providers/:id - Get provider by ID
// GOOGLE SHEETS PRIMARY: Reads from Google Sheets first, falls back to PostgreSQL
export const getProvider = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const organizationId = req.user?.organizationId;
  let dataSource = 'GOOGLE_SHEETS';

  if (!organizationId || !id) {
    res.status(400).json({
      success: false,
      message: 'Organization ID and Provider ID are required'
    });
    return;
  }

  let provider: any = null;

  // Try to read from Google Sheets first (PRIMARY DATA SOURCE)
  try {
    console.log(`Reading single provider ${id} from Google Sheets`);
    provider = await googleSheetsService.getProvider(organizationId, id);
    console.log(`Successfully read provider ${id} from Google Sheets`);

  } catch (error: any) {
    console.warn(`Failed to read provider ${id} from Google Sheets, falling back to PostgreSQL:`, error);
    dataSource = 'POSTGRESQL_FALLBACK';

    // Fallback to PostgreSQL
    try {
      provider = await prisma.provider.findFirst({
        where: {
          id,
          organizationId
        },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatar: true
          }
        },
        appointments: {
          where: {
            scheduledAt: {
              gte: new Date()
            }
          },
          take: 10,
          orderBy: {
            scheduledAt: 'asc'
          },
          include: {
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true
              }
            }
          }
        },
        _count: {
          select: {
            appointments: true
          }
        }
      }
      });
      console.log(`Fallback: Read provider ${id} from PostgreSQL`);
    } catch (pgError: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve provider from both data sources',
        error: pgError.message
      });
      return;
    }
  }

  if (!provider) {
    res.status(404).json({
      success: false,
      message: 'Provider not found'
    });
    return;
  }

  res.json({
    success: true,
    dataSource, // Indicate which data source was used
    data: provider
  });
});

// PUT /api/providers/:id - Update provider
export const updateProvider = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const organizationId = req.user?.organizationId;

  if (!organizationId || !id) {
    res.status(400).json({
      success: false,
      message: 'Organization ID and Provider ID are required'
    });
    return;
  }

  try {
    const validatedData = updateProviderSchema.parse(req.body);

    // Check if provider exists and belongs to organization
    const existingProvider = await prisma.provider.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!existingProvider) {
      res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
      return;
    }

    // Check for duplicate email within organization (excluding current provider)
    if (validatedData.email) {
      const duplicateProvider = await prisma.provider.findFirst({
        where: {
          organizationId,
          email: validatedData.email,
          NOT: { id }
        }
      });

      if (duplicateProvider) {
        res.status(409).json({
          success: false,
          message: 'A provider with this email already exists'
        });
        return;
      }
    }

    const updateData: any = { ...validatedData };
    
    const updatedProvider = await prisma.provider.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true
          }
        },
        _count: {
          select: {
            appointments: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Provider updated successfully',
      data: updatedProvider
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Failed to update provider',
      error: error.message
    });
  }
});

// DELETE /api/providers/:id - Soft delete provider
export const deleteProvider = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const organizationId = req.user?.organizationId;

  if (!organizationId || !id) {
    res.status(400).json({
      success: false,
      message: 'Organization ID and Provider ID are required'
    });
    return;
  }

  try {
    // Check if provider exists and belongs to organization
    const existingProvider = await prisma.provider.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!existingProvider) {
      res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
      return;
    }

    // Check if provider has future appointments
    const futureAppointments = await prisma.appointment.count({
      where: {
        providerId: id,
        scheduledAt: {
          gte: new Date()
        },
        status: {
          in: ['SCHEDULED', 'CONFIRMED']
        }
      }
    });

    if (futureAppointments > 0) {
      res.status(409).json({
        success: false,
        message: `Cannot delete provider with ${futureAppointments} future appointments. Please reschedule or cancel appointments first.`
      });
      return;
    }

    // Soft delete by setting isActive to false
    const deletedProvider = await prisma.provider.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        specialization: true,
        isActive: true
      }
    });

    res.json({
      success: true,
      message: 'Provider deactivated successfully',
      data: deletedProvider
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate provider',
      error: error.message
    });
  }
});

// GET /api/providers/:id/availability - Get provider availability
export const getProviderAvailability = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const organizationId = req.user?.organizationId;
  const { date, days = '7' } = req.query;

  if (!organizationId || !id) {
    res.status(400).json({
      success: false,
      message: 'Organization ID and Provider ID are required'
    });
    return;
  }

  try {
    // Validate provider exists
    const provider = await prisma.provider.findFirst({
      where: {
        id,
        organizationId,
        isActive: true
      }
    });

    if (!provider) {
      res.status(404).json({
        success: false,
        message: 'Provider not found or inactive'
      });
      return;
    }

    const startDate = date ? new Date(date as string) : new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + parseInt(days as string));

    // Get existing appointments for the period
    const appointments = await prisma.appointment.findMany({
      where: {
        providerId: id,
        scheduledAt: {
          gte: startDate,
          lt: endDate
        },
        status: {
          in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS']
        }
      },
      select: {
        scheduledAt: true,
        duration: true,
        endTime: true
      },
      orderBy: {
        scheduledAt: 'asc'
      }
    });

    // Simple availability response for now
    res.json({
      success: true,
      data: {
        providerId: id,
        providerName: `${provider.firstName} ${provider.lastName}`,
        consultationDuration: provider.consultationDuration,
        workingHours: provider.workingHours,
        bookedSlots: appointments.length,
        message: 'Basic availability check - detailed slot calculation available'
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to get provider availability',
      error: error.message
    });
  }
});

// GET /api/providers/analytics - Provider analytics
export const getProviderAnalytics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const organizationId = req.user?.organizationId;

  if (!organizationId) {
    res.status(400).json({
      success: false,
      message: 'Organization ID is required'
    });
    return;
  }

  try {
    const { period = '30' } = req.query;
    const days = parseInt(period as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      totalProviders,
      activeProviders,
      specializationStats
    ] = await Promise.all([
      // Total providers
      prisma.provider.count({
        where: { organizationId }
      }),

      // Active providers
      prisma.provider.count({
        where: { organizationId, isActive: true }
      }),

      // Specialization distribution
      prisma.provider.groupBy({
        by: ['specialization'],
        where: {
          organizationId,
          isActive: true
        },
        _count: {
          specialization: true
        },
        orderBy: {
          _count: {
            specialization: 'desc'
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalProviders,
          activeProviders,
          inactiveProviders: totalProviders - activeProviders
        },
        specializationDistribution: specializationStats.map((stat: any) => ({
          specialization: stat.specialization,
          count: stat._count.specialization
        })),
        period: `${days} days`
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to get provider analytics',
      error: error.message
    });
  }
});
