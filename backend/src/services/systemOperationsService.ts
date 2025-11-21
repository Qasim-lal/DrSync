/**
 * System Operations Service - PostgreSQL System Layer
 * 
 * Preserves PostgreSQL for critical system operations that must remain
 * separate from the primary Google Sheets data source. This service
 * handles authentication, RBAC, system logs, billing, monitoring,
 * and other infrastructure concerns.
 * 
 * Architecture:
 * - Google Sheets: Primary data (appointments, patients, providers)
 * - PostgreSQL: System operations (auth, logs, billing, monitoring)
 * 
 * Features:
 * 1. Authentication & Authorization (JWT, sessions, RBAC)
 * 2. System logging and audit trails
 * 3. Billing and subscription management  
 * 4. Performance monitoring and analytics
 * 5. Organization and user management
 * 6. WhatsApp message logs and delivery tracking
 * 7. System configuration and settings
 * 8. Backup and recovery metadata
 * 
 * @version 1.0
 * @author DrSync Development Team
 * @date September 12, 2025
 */

import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import getPrismaClient from './prisma';

// Types for system operations
interface SystemUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'STAFF' | 'NURSE' | 'DOCTOR' | 'ORG_ADMIN' | 'SUPER_ADMIN';
  organizationId: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface SystemOrganization {
  id: string;
  name: string;
  googleSheetsId?: string;
  whatsappCredentials?: any;
  subscriptionTier: 'FREE' | 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE';
  isActive: boolean;
  // settings: any; // Field doesn't exist in schema
  createdAt: Date;
  updatedAt: Date;
}

interface AuditLogEntry {
  id: string;
  userId: string;
  organizationId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: any; // Mapped from oldValues for compatibility
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date; // Mapped from createdAt for compatibility
}

interface BillingRecord {
  id: string;
  organizationId: string;
  subscriptionTier: 'FREE' | 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE';
  billingCycle: 'MONTHLY' | 'YEARLY';
  amount: number; // Will be converted from Decimal
  currency: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  paidAt?: Date;
  createdAt: Date;
}

interface SystemMetrics {
  timestamp: Date;
  organizationId: string;
  metric: string;
  value: number;
  unit: string;
  tags?: any;
}

interface WhatsAppMessageLog {
  id: string;
  organizationId: string;
  patientId?: string;
  appointmentId?: string;
  messageType: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'AUDIO' | 'VIDEO' | 'LOCATION' | 'CONTACT' | 'TEMPLATE' | 'INTERACTIVE';
  direction: 'INBOUND' | 'OUTBOUND';
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  content: string;
  templateName?: string;
  templateParams?: any;
  whatsappMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
}

class SystemOperationsService {
  /**
   * USER MANAGEMENT & AUTHENTICATION
   * PostgreSQL remains authoritative for user accounts, roles, and sessions
   */

  async createUser(userData: {
    email: string;
    firstName: string;
    lastName: string;
    role: SystemUser['role'];
    organizationId: string;
    password: string;
  }): Promise<SystemUser> {
    try {
      logger.info(`Creating system user: ${userData.email} for organization ${userData.organizationId}`);

      // Check if user already exists
      const prisma = getPrismaClient();
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Verify organization exists
      const organization = await prisma.organization.findUnique({
        where: { id: userData.organizationId }
      });

      if (!organization) {
        throw new Error('Organization not found');
      }

      // Create user in PostgreSQL (system operations)
      const user = await prisma.user.create({
        data: {
          id: uuidv4(),
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          organizationId: userData.organizationId,
          password: await this.hashPassword(userData.password),
          isActive: true,
          emailVerified: false
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          organizationId: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true
        }
      });

      // Log user creation
      await this.createAuditLog({
        userId: user.id,
        organizationId: user.organizationId,
        action: 'USER_CREATED',
        entityType: 'USER',
        entityId: user.id,
        changes: {
          email: userData.email,
          role: userData.role,
          organizationId: userData.organizationId
        }
      });

      logger.info(`System user created successfully: ${user.email} (${user.id})`);
      return user as SystemUser;

    } catch (error) {
      logger.error('Error creating system user:', error);
      throw error;
    }
  }

  async authenticateUser(email: string, password: string): Promise<{
    user: SystemUser;
    sessionToken: string;
    expiresAt: Date;
  } | null> {
    try {
      // Find user in PostgreSQL (system operations)
      const prisma = getPrismaClient();
      const user = await prisma.user.findUnique({
        where: { email },
        include: { organization: true }
      });

      if (!user || !user.isActive || !user.organization?.isActive) {
        return null;
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(password, user.password);
      if (!isValidPassword) {
        return null;
      }

      // Create session
      const sessionToken = uuidv4();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await prisma.session.create({
        data: {
          id: sessionToken,
          userId: user.id,
          expiresAt,
          createdAt: new Date()
        }
      });

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      // Log authentication
      await this.createAuditLog({
        userId: user.id,
        organizationId: user.organizationId,
        action: 'USER_LOGIN',
        entityType: 'SESSION',
        entityId: sessionToken,
        changes: { loginTime: new Date() }
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role as SystemUser['role'],
          organizationId: user.organizationId,
          isActive: user.isActive,
          ...(user.lastLoginAt && { lastLoginAt: user.lastLoginAt }),
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        sessionToken,
        expiresAt
      };

    } catch (error) {
      logger.error('Error authenticating user:', error);
      return null;
    }
  }

  /**
   * ORGANIZATION MANAGEMENT
   * PostgreSQL manages organization settings, subscriptions, and configurations
   */

  async createOrganization(orgData: {
    name: string;
    subscriptionTier: SystemOrganization['subscriptionTier'];
    adminEmail: string;
    adminFirstName: string;
    adminLastName: string;
    adminPassword: string;
  }): Promise<SystemOrganization> {
    try {
      logger.info(`Creating organization: ${orgData.name}`);

      const organizationId = uuidv4();

      // Create organization in PostgreSQL (system operations)
      const prisma = getPrismaClient();
      const organization = await prisma.organization.create({
        data: {
          id: organizationId,
          name: orgData.name,
          slug: orgData.name.toLowerCase().replace(/\s+/g, '-'),
          email: orgData.adminEmail,
          subscriptionPlan: orgData.subscriptionTier as 'FREE' | 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE',
          isActive: true
          // settings removed - not in schema
        }
      });

      // Create admin user
      await this.createUser({
        email: orgData.adminEmail,
        firstName: orgData.adminFirstName,
        lastName: orgData.adminLastName,
        role: 'ORG_ADMIN',
        organizationId: organization.id,
        password: orgData.adminPassword
      });

      // Create initial billing record
      await this.createBillingRecord({
        organizationId: organization.id,
        subscriptionTier: orgData.subscriptionTier,
        billingCycle: 'MONTHLY',
        amount: this.getSubscriptionPrice(orgData.subscriptionTier, 'MONTHLY'),
        currency: 'USD',
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });

      logger.info(`Organization created successfully: ${organization.name} (${organization.id})`);

      return {
        id: organization.id,
        name: organization.name,
        ...(organization.googleSheetsId && { googleSheetsId: organization.googleSheetsId }),
        whatsappCredentials: organization.whatsappCredentials,
        subscriptionTier: organization.subscriptionPlan as SystemOrganization['subscriptionTier'],
        isActive: organization.isActive,
        // settings: organization.settings, // Field doesn't exist in schema
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt
      };

    } catch (error) {
      logger.error('Error creating organization:', error);
      throw error;
    }
  }

  /**
   * AUDIT LOGGING
   * All system actions are logged in PostgreSQL for compliance and debugging
   */

  async createAuditLog(logData: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    try {
      const prisma = getPrismaClient();
      await prisma.auditLog.create({
        data: {
          id: uuidv4(),
          userId: logData.userId,
          organizationId: logData.organizationId,
          action: logData.action,
          entityType: logData.entityType,
          entityId: logData.entityId,
          oldValues: logData.changes, // Using changes as oldValues for now
          ...(logData.ipAddress && { ipAddress: logData.ipAddress }),
          ...(logData.userAgent && { userAgent: logData.userAgent })
        }
      });
    } catch (error) {
      logger.error('Error creating audit log:', error);
      // Don't throw - audit logging failure shouldn't break operations
    }
  }

  async getAuditLogs(organizationId: string, filters: {
    userId?: string;
    action?: string;
    entityType?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  } = {}): Promise<{ logs: AuditLogEntry[]; total: number }> {
    try {
      const { page = 1, limit = 50 } = filters;
      const skip = (page - 1) * limit;

      const whereClause: any = {
        organizationId
      };

      if (filters.userId) whereClause.userId = filters.userId;
      if (filters.action) whereClause.action = filters.action;
      if (filters.entityType) whereClause.entityType = filters.entityType;
      if (filters.startDate || filters.endDate) {
        whereClause.createdAt = {};
        if (filters.startDate) whereClause.createdAt.gte = filters.startDate;
        if (filters.endDate) whereClause.createdAt.lte = filters.endDate;
      }

      const prisma = getPrismaClient();
      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            user: {
              select: { firstName: true, lastName: true, email: true }
            }
          }
        }),
        prisma.auditLog.count({ where: whereClause })
      ]);

      return {
        logs: logs.map((log: any) => ({
          id: log.id,
          userId: log.userId ?? '',
          organizationId: log.organizationId,
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId ?? '',
          changes: log.oldValues, // Using oldValues as changes for compatibility
          ...(log.ipAddress && { ipAddress: log.ipAddress }),
          ...(log.userAgent && { userAgent: log.userAgent }),
          timestamp: log.createdAt
        })),
        total
      };

    } catch (error) {
      logger.error('Error retrieving audit logs:', error);
      throw error;
    }
  }

  /**
   * BILLING MANAGEMENT
   * PostgreSQL handles all billing, subscriptions, and payment records
   */

  async createBillingRecord(billingData: Omit<BillingRecord, 'id' | 'status' | 'createdAt' | 'dueDate'>): Promise<BillingRecord> {
    try {
      const dueDate = new Date(billingData.periodEnd);
      dueDate.setDate(dueDate.getDate() + 7); // 7 days grace period

      const prisma = getPrismaClient();
      const record = await prisma.billingRecord.create({
        data: {
          id: uuidv4(),
          organizationId: billingData.organizationId,
          subscriptionTier: billingData.subscriptionTier,
          billingCycle: billingData.billingCycle,
          amount: billingData.amount,
          currency: billingData.currency,
          status: 'PENDING',
          periodStart: billingData.periodStart,
          periodEnd: billingData.periodEnd,
          dueDate
        }
      });

      logger.info(`Billing record created: ${record.id} for organization ${billingData.organizationId}`);
      return {
        ...record,
        amount: Number(record.amount)
      } as BillingRecord;

    } catch (error) {
      logger.error('Error creating billing record:', error);
      throw error;
    }
  }

  async getBillingHistory(organizationId: string, page: number = 1, limit: number = 20): Promise<{
    records: BillingRecord[];
    total: number;
  }> {
    try {
      const skip = (page - 1) * limit;

      const prisma = getPrismaClient();
      const [records, total] = await Promise.all([
        prisma.billingRecord.findMany({
          where: { organizationId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.billingRecord.count({ where: { organizationId } })
      ]);

      return {
        records: records.map((record: any) => ({
          ...record,
          amount: Number(record.amount) // Convert Decimal to number
        })) as BillingRecord[],
        total
      };

    } catch (error) {
      logger.error('Error retrieving billing history:', error);
      throw error;
    }
  }

  /**
   * WHATSAPP MESSAGE LOGGING
   * PostgreSQL stores all WhatsApp communication logs for compliance
   */

  async logWhatsAppMessage(messageData: Omit<WhatsAppMessageLog, 'id' | 'sentAt'>): Promise<void> {
    try {
      const prisma = getPrismaClient();
      await prisma.whatsAppMessage.create({
        data: {
          id: uuidv4(),
          organizationId: messageData.organizationId,
          patientId: messageData.patientId || '',
          messageType: messageData.messageType as any, // Cast to schema enum
          direction: messageData.direction as 'INBOUND' | 'OUTBOUND',
          status: messageData.status as any, // Cast to schema enum
          content: messageData.content,
          language: 'en', // Default language
          ...(messageData.appointmentId && { appointmentId: messageData.appointmentId }),
          ...(messageData.templateName && { templateName: messageData.templateName }),
          ...(messageData.templateParams && { templateParams: messageData.templateParams }),
          ...(messageData.whatsappMessageId && { whatsappMessageId: messageData.whatsappMessageId }),
          ...(messageData.deliveredAt && { deliveredAt: messageData.deliveredAt }),
          ...(messageData.readAt && { readAt: messageData.readAt })
        }
      });
    } catch (error) {
      logger.error('Error logging WhatsApp message:', error);
      // Don't throw - message logging failure shouldn't break messaging
    }
  }

  async getWhatsAppMessageLogs(organizationId: string, filters: {
    patientId?: string;
    appointmentId?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  } = {}): Promise<{ messages: WhatsAppMessageLog[]; total: number }> {
    try {
      const { page = 1, limit = 50 } = filters;
      const skip = (page - 1) * limit;

      const whereClause: any = { organizationId };
      if (filters.patientId) whereClause.patientId = filters.patientId;
      if (filters.appointmentId) whereClause.appointmentId = filters.appointmentId;
      if (filters.status) whereClause.status = filters.status;
      if (filters.startDate || filters.endDate) {
        whereClause.sentAt = {};
        if (filters.startDate) whereClause.sentAt.gte = filters.startDate;
        if (filters.endDate) whereClause.sentAt.lte = filters.endDate;
      }

      const prisma = getPrismaClient();
      const [messages, total] = await Promise.all([
        prisma.whatsAppMessage.findMany({
          where: whereClause,
          orderBy: { sentAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.whatsAppMessage.count({ where: whereClause })
      ]);

      return {
        messages: messages as WhatsAppMessageLog[],
        total
      };

    } catch (error) {
      logger.error('Error retrieving WhatsApp message logs:', error);
      throw error;
    }
  }

  /**
   * SYSTEM METRICS & MONITORING
   * PostgreSQL stores performance metrics and system health data
   */

  async recordMetric(metricData: Omit<SystemMetrics, 'timestamp'>): Promise<void> {
    try {
      const prisma = getPrismaClient();
      await prisma.systemMetric.create({
        data: {
          timestamp: new Date(),
          organizationId: metricData.organizationId,
          metric: metricData.metric,
          value: metricData.value,
          unit: metricData.unit,
          tags: metricData.tags
        }
      });
    } catch (error) {
      logger.error('Error recording system metric:', error);
      // Don't throw - metrics failure shouldn't break operations
    }
  }

  async getMetrics(organizationId: string, metric: string, timeRange: {
    startTime: Date;
    endTime: Date;
  }): Promise<SystemMetrics[]> {
    try {
      const prisma = getPrismaClient();
      const metrics = await prisma.systemMetric.findMany({
        where: {
          organizationId,
          metric,
          timestamp: {
            gte: timeRange.startTime,
            lte: timeRange.endTime
          }
        },
        orderBy: { timestamp: 'asc' }
      });

      return metrics as SystemMetrics[];

    } catch (error) {
      logger.error('Error retrieving system metrics:', error);
      throw error;
    }
  }

  /**
   * HELPER METHODS
   */

  private async hashPassword(password: string): Promise<string> {
    // In real implementation, use bcrypt or similar
    const bcrypt = require('bcrypt');
    return await bcrypt.hash(password, 10);
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    // In real implementation, use bcrypt or similar
    const bcrypt = require('bcrypt');
    return await bcrypt.compare(password, hash);
  }

  private getSubscriptionPrice(tier: SystemOrganization['subscriptionTier'], cycle: 'MONTHLY' | 'YEARLY'): number {
    const pricing = {
      FREE: { MONTHLY: 0, YEARLY: 0 },
      BASIC: { MONTHLY: 29, YEARLY: 290 },
      PROFESSIONAL: { MONTHLY: 99, YEARLY: 990 },
      ENTERPRISE: { MONTHLY: 299, YEARLY: 2990 }
    };
    return pricing[tier][cycle];
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<{
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    checks: Array<{
      name: string;
      status: 'PASS' | 'FAIL';
      message: string;
      responseTime?: number;
    }>;
  }> {
    const checks = [];
    let overallStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';

    try {
      // Database connectivity check
      const dbStart = Date.now();
      const prisma = getPrismaClient();
      await prisma.$queryRaw`SELECT 1`;
      const dbTime = Date.now() - dbStart;
      
      checks.push({
        name: 'PostgreSQL Database',
        status: (dbTime < 1000 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        message: dbTime < 1000 ? 'Database responsive' : 'Database slow response',
        responseTime: dbTime
      });

      if (dbTime >= 1000) overallStatus = 'WARNING';
      if (dbTime >= 5000) overallStatus = 'CRITICAL';

      // Check active organizations
      const activeOrgs = await prisma.organization.count({
        where: { isActive: true }
      });

      checks.push({
        name: 'Active Organizations',
        status: 'PASS' as 'PASS' | 'FAIL',
        message: `${activeOrgs} active organizations`
      });

      // Check recent audit logs (system activity)
      const recentLogs = await prisma.auditLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      });

      checks.push({
        name: 'System Activity',
        status: (recentLogs > 0 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        message: `${recentLogs} audit logs in last 24 hours`
      });

      if (recentLogs === 0 && overallStatus === 'HEALTHY') {
        overallStatus = 'WARNING';
      }

    } catch (error) {
      logger.error('Error checking system health:', error);
      overallStatus = 'CRITICAL';
      checks.push({
        name: 'System Health Check',
        status: 'FAIL' as 'PASS' | 'FAIL',
        message: 'Health check failed'
      });
    }

    return { status: overallStatus, checks };
  }
}

export const systemOperationsService = new SystemOperationsService();
export default systemOperationsService;
export { SystemUser, SystemOrganization, AuditLogEntry, BillingRecord, SystemMetrics, WhatsAppMessageLog };