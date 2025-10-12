import { PrismaClient, Organization, User, Prisma } from '../generated/prisma';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Super Admin Service
 * Business logic for platform-wide administration
 * 
 * SECURITY NOTE: All methods assume SUPER_ADMIN authorization has been verified
 * by middleware. No patient PHI data is accessed - only organizational metadata.
 */

export interface OrganizationFilters {
  search?: string;
  subscriptionStatus?: string[];  // TRIAL, ACTIVE, PAST_DUE, CANCELLED, SUSPENDED
  organizationType?: string[];    // CLINIC, DOCTOR, HOSPITAL, etc.
  subscriptionPlan?: string[];    // FREE, BASIC, PROFESSIONAL, ENTERPRISE
  region?: string;                // PAKISTAN, INTERNATIONAL
  isActive?: boolean;
  createdFrom?: Date;
  createdTo?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;                // name, createdAt, subscriptionStatus
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedOrganizations {
  organizations: Organization[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface OrganizationDetails extends Organization {
  _count: {
    users: number;
    patients: number;
    appointments: number;
    messages: number;
  };
  users: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    lastLoginAt: Date | null;
  }>;
}

export interface OrganizationStatistics {
  total: number;
  active: number;
  trial: number;
  suspended: number;
  inactive: number;
  newToday: number;
  newThisWeek: number;
  newThisMonth: number;
  byType: Record<string, number>;
  byPlan: Record<string, number>;
  byRegion: Record<string, number>;
  byStatus: Record<string, number>;
}

class SuperAdminService {
  /**
   * SUBTASK-038A-001: Organization Listing & Search
   * Get paginated list of organizations with filtering
   */
  async listOrganizations(filters: OrganizationFilters): Promise<PaginatedOrganizations> {
    try {
      const {
        search,
        subscriptionStatus,
        organizationType,
        subscriptionPlan,
        region,
        isActive,
        createdFrom,
        createdTo,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      // Build where clause
      const where: Prisma.OrganizationWhereInput = {};

      // Multi-field search
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { address: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Subscription status filter
      if (subscriptionStatus && subscriptionStatus.length > 0) {
        where.subscriptionStatus = { in: subscriptionStatus as any[] };
      }

      // Organization type filter
      if (organizationType && organizationType.length > 0) {
        where.organizationType = { in: organizationType as any[] };
      }

      // Subscription plan filter
      if (subscriptionPlan && subscriptionPlan.length > 0) {
        where.subscriptionPlan = { in: subscriptionPlan as any[] };
      }

      // Region filter
      if (region) {
        where.region = region;
      }

      // Active/inactive filter
      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      // Date range filter
      if (createdFrom || createdTo) {
        where.createdAt = {};
        if (createdFrom) {
          where.createdAt.gte = createdFrom;
        }
        if (createdTo) {
          where.createdAt.lte = createdTo;
        }
      }

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Build orderBy
      const orderBy: Prisma.OrganizationOrderByWithRelationInput = {};
      if (sortBy === 'name') {
        orderBy.name = sortOrder;
      } else if (sortBy === 'createdAt') {
        orderBy.createdAt = sortOrder;
      } else if (sortBy === 'subscriptionStatus') {
        orderBy.subscriptionStatus = sortOrder;
      } else {
        orderBy.createdAt = 'desc';
      }

      // Execute query with pagination
      const [organizations, total] = await Promise.all([
        prisma.organization.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          select: {
            id: true,
            name: true,
            slug: true,
            organizationType: true,
            email: true,
            phone: true,
            address: true,
            website: true,
            subscriptionPlan: true,
            subscriptionStatus: true,
            subscriptionEndsAt: true,
            region: true,
            timezone: true,
            language: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            doctorCount: true,
            whatsappPhoneNumber: true,
            whatsappPhoneVerified: true,
            whatsappConfigured: true,
            googleSheetsId: true,
            googleSheetsSyncEnabled: true,
            // Exclude sensitive credentials
            googleSheetsUrl: false,
            googleCredentials: false,
            googleSheetsTokens: false,
            whatsappCredentials: false,
            whatsappWebhookToken: false,
            whatsappVerifyToken: false
          }
        }),
        prisma.organization.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);
      const hasMore = page < totalPages;

      logger.info(
        `Listed ${organizations.length} organizations (page ${page}/${totalPages}, total: ${total})`
      );

      return {
        organizations: organizations as Organization[],
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore
        }
      };
    } catch (error) {
      logger.error('Error listing organizations:', error);
      throw new Error('Failed to retrieve organizations');
    }
  }

  /**
   * SUBTASK-038A-002: Organization Details View
   * Get comprehensive details for a single organization
   */
  async getOrganizationDetails(organizationId: string): Promise<OrganizationDetails | null> {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          _count: {
            select: {
              users: true,
              patients: true,
              appointments: true,
              messages: true
            }
          },
          users: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              isActive: true,
              lastLoginAt: true
            },
            orderBy: {
              createdAt: 'asc'
            }
          }
        }
      });

      if (!organization) {
        logger.warn(`Organization not found: ${organizationId}`);
        return null;
      }

      // Mask sensitive credentials
      const sanitizedOrg = {
        ...organization,
        googleCredentials: organization.googleCredentials ? '***MASKED***' : null,
        googleSheetsTokens: organization.googleSheetsTokens ? '***MASKED***' : null,
        whatsappCredentials: organization.whatsappCredentials ? '***MASKED***' : null,
        whatsappWebhookToken: organization.whatsappWebhookToken ? '***MASKED***' : null,
        whatsappVerifyToken: organization.whatsappVerifyToken ? '***MASKED***' : null
      };

      logger.info(`Retrieved details for organization: ${organization.name} (${organizationId})`);
      return sanitizedOrg as any;
    } catch (error) {
      logger.error(`Error getting organization details for ${organizationId}:`, error);
      throw new Error('Failed to retrieve organization details');
    }
  }

  /**
   * SUBTASK-038A-006: Organization Statistics Dashboard
   * Get platform-wide organization statistics
   */
  async getOrganizationStatistics(): Promise<OrganizationStatistics> {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        total,
        active,
        trial,
        suspended,
        inactive,
        newToday,
        newThisWeek,
        newThisMonth,
        byType,
        byPlan,
        byRegion,
        byStatus
      ] = await Promise.all([
        // Total organizations
        prisma.organization.count(),
        
        // Active organizations
        prisma.organization.count({
          where: { isActive: true }
        }),
        
        // Trial organizations
        prisma.organization.count({
          where: { subscriptionStatus: 'TRIAL' }
        }),
        
        // Suspended organizations
        prisma.organization.count({
          where: { subscriptionStatus: 'SUSPENDED' }
        }),
        
        // Inactive organizations
        prisma.organization.count({
          where: { isActive: false }
        }),
        
        // New today
        prisma.organization.count({
          where: { createdAt: { gte: todayStart } }
        }),
        
        // New this week
        prisma.organization.count({
          where: { createdAt: { gte: weekStart } }
        }),
        
        // New this month
        prisma.organization.count({
          where: { createdAt: { gte: monthStart } }
        }),
        
        // Group by organization type
        prisma.organization.groupBy({
          by: ['organizationType'],
          _count: true
        }),
        
        // Group by subscription plan
        prisma.organization.groupBy({
          by: ['subscriptionPlan'],
          _count: true
        }),
        
        // Group by region
        prisma.organization.groupBy({
          by: ['region'],
          _count: true
        }),
        
        // Group by subscription status
        prisma.organization.groupBy({
          by: ['subscriptionStatus'],
          _count: true
        })
      ]);

      // Convert grouped results to Record format
      const byTypeRecord = byType.reduce((acc, item) => {
        acc[item.organizationType] = item._count;
        return acc;
      }, {} as Record<string, number>);

      const byPlanRecord = byPlan.reduce((acc, item) => {
        acc[item.subscriptionPlan] = item._count;
        return acc;
      }, {} as Record<string, number>);

      const byRegionRecord = byRegion.reduce((acc, item) => {
        acc[item.region] = item._count;
        return acc;
      }, {} as Record<string, number>);

      const byStatusRecord = byStatus.reduce((acc, item) => {
        acc[item.subscriptionStatus] = item._count;
        return acc;
      }, {} as Record<string, number>);

      const statistics: OrganizationStatistics = {
        total,
        active,
        trial,
        suspended,
        inactive,
        newToday,
        newThisWeek,
        newThisMonth,
        byType: byTypeRecord,
        byPlan: byPlanRecord,
        byRegion: byRegionRecord,
        byStatus: byStatusRecord
      };

      logger.info(`Retrieved organization statistics: ${total} total organizations`);
      return statistics;
    } catch (error) {
      logger.error('Error getting organization statistics:', error);
      throw new Error('Failed to retrieve organization statistics');
    }
  }

  /**
   * SUBTASK-038A-003: Organization Status Management
   * Update organization active status
   */
  async updateOrganizationStatus(
    organizationId: string,
    isActive: boolean,
    reason?: string
  ): Promise<Organization> {
    try {
      const organization = await prisma.organization.update({
        where: { id: organizationId },
        data: { isActive }
      });

      logger.info(
        `Organization ${organization.name} (${organizationId}) ` +
        `${isActive ? 'activated' : 'deactivated'}. Reason: ${reason || 'Not specified'}`
      );

      return organization;
    } catch (error) {
      logger.error(`Error updating organization status for ${organizationId}:`, error);
      throw new Error('Failed to update organization status');
    }
  }

  /**
   * SUBTASK-038A-003: Organization suspension
   */
  async suspendOrganization(
    organizationId: string,
    reason: string
  ): Promise<Organization> {
    try {
      const organization = await prisma.organization.update({
        where: { id: organizationId },
        data: {
          subscriptionStatus: 'SUSPENDED',
          isActive: false
        }
      });

      logger.warn(
        `Organization ${organization.name} (${organizationId}) SUSPENDED. Reason: ${reason}`
      );

      return organization;
    } catch (error) {
      logger.error(`Error suspending organization ${organizationId}:`, error);
      throw new Error('Failed to suspend organization');
    }
  }

  /**
   * SUBTASK-038A-004: Get organization configuration
   */
  async getOrganizationConfig(organizationId: string) {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          id: true,
          name: true,
          timezone: true,
          language: true,
          region: true,
          maxPatients: true,
          maxAppointments: true,
          subscriptionPlan: true,
          subscriptionStatus: true,
          doctorCount: true,
          whatsappConfigured: true,
          whatsappPhoneVerified: true,
          googleSheetsSyncEnabled: true,
          googleSheetsSyncFrequency: true,
          setupProgress: true
        }
      });

      if (!org) {
        throw new Error('Organization not found');
      }

      return org;
    } catch (error) {
      logger.error(`Error getting organization config for ${organizationId}:`, error);
      throw new Error('Failed to retrieve organization configuration');
    }
  }

  /**
   * SUBTASK-038A-004: Update trial limits
   */
  async updateTrialLimits(
    organizationId: string,
    maxPatients: number,
    maxAppointments: number
  ): Promise<Organization> {
    try {
      const organization = await prisma.organization.update({
        where: { id: organizationId },
        data: {
          maxPatients,
          maxAppointments
        }
      });

      logger.info(
        `Updated trial limits for ${organization.name}: ` +
        `maxPatients=${maxPatients}, maxAppointments=${maxAppointments}`
      );

      return organization;
    } catch (error) {
      logger.error(`Error updating trial limits for ${organizationId}:`, error);
      throw new Error('Failed to update trial limits');
    }
  }

  /**
   * SUBTASK-038A-005: Get organization users
   */
  async getOrganizationUsers(organizationId: string): Promise<User[]> {
    try {
      const users = await prisma.user.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'asc' }
      });

      logger.info(`Retrieved ${users.length} users for organization ${organizationId}`);
      return users;
    } catch (error) {
      logger.error(`Error getting users for organization ${organizationId}:`, error);
      throw new Error('Failed to retrieve organization users');
    }
  }
}

export const superAdminService = new SuperAdminService();
