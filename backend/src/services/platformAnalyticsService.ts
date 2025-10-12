import { PrismaClient } from '../generated/prisma';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Platform Analytics Service
 * Handles system-wide analytics, health monitoring, usage tracking, and growth metrics
 * TASK-038C: Platform Analytics Dashboard
 */

// ==================== INTERFACES ====================

export interface SystemHealthOverview {
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;  // percentage
  activeOrganizations: number;
  activeUsers: number;
  apiPerformance: {
    averageResponseTime: number;  // milliseconds
    errorRate: number;  // percentage
    requestsPerMinute: number;
  };
  databaseHealth: {
    connectionCount: number;
    avgQueryTime: number;
    slowQueryCount: number;
  };
  externalServices: {
    whatsapp: { status: string; successRate: number };
    googleSheets: { status: string; successRate: number };
    email: { status: string; deliveryRate: number };
  };
}

export interface UsageAnalytics {
  dailyActiveOrgs: number;
  monthlyActiveOrgs: number;
  dauMauRatio: number;
  totalAppointments: number;
  appointmentsByMethod: {
    whatsapp: number;
    dashboard: number;
  };
  featureAdoption: {
    whatsappSetup: number;  // percentage
    googleSheetsSetup: number;  // percentage
    staffInvitations: number;  // percentage
  };
  communicationMetrics: {
    whatsappMessagesSent: number;
    whatsappMessagesReceived: number;
    remindersSent: number;
    deliveryRate: number;
  };
  engagementMetrics: {
    averageSessionDuration: number;  // minutes
    loginsToday: number;
    loginsThisWeek: number;
    loginsThisMonth: number;
  };
}

export interface GrowthAnalytics {
  registrationFunnel: {
    signups: number;
    emailVerified: number;
    whatsappConfigured: number;
    sheetsConfigured: number;
    activeUsers: number;
    conversionRate: number;
  };
  trialConversion: {
    totalTrials: number;
    converted: number;
    cancelled: number;
    conversionRate: number;
    averageDaysToConvert: number;
  };
  growthMetrics: {
    organizationGrowth: {
      total: number;
      newToday: number;
      newThisWeek: number;
      newThisMonth: number;
      monthOverMonthGrowth: number;  // percentage
    };
    userGrowth: {
      total: number;
      newToday: number;
      newThisWeek: number;
      newThisMonth: number;
    };
    revenueGrowth: {
      mrr: number;
      mrrGrowth: number;  // percentage
    };
  };
  cohortRetention: {
    month0: number;
    month1: number;
    month3: number;
    month6: number;
    month12: number;
  };
}

export interface PerformanceBenchmarks {
  appointmentsPerOrg: {
    p25: number;
    p50: number;
    p75: number;
    p95: number;
  };
  patientsPerOrg: {
    p25: number;
    p50: number;
    p75: number;
    p95: number;
  };
  messagesPerOrg: {
    p25: number;
    p50: number;
    p75: number;
    p95: number;
  };
  highPerformers: Array<{
    organizationId: string;
    name: string;
    metrics: {
      appointmentsPerMonth: number;
      patientsTotal: number;
      messagesPerDay: number;
    };
  }>;
  lowPerformers: Array<{
    organizationId: string;
    name: string;
    issueType: string;
    suggestions: string[];
  }>;
}

// ==================== SERVICE CLASS ====================

class PlatformAnalyticsService {
  
  // ==================== SUBTASK-038C-001: Platform Health Monitoring ====================
  
  /**
   * Get comprehensive system health overview
   * SUBTASK-038C-001-1: System health overview endpoint
   */
  async getSystemHealth(): Promise<SystemHealthOverview> {
    try {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Active organizations (logged in within last 7 days)
      const activeOrganizations = await prisma.organization.count({
        where: {
          isActive: true,
          updatedAt: { gte: oneWeekAgo }
        }
      });

      // Active users (logged in within last 7 days)
      const activeUsers = await prisma.user.count({
        where: {
          isActive: true,
          lastLoginAt: { gte: oneWeekAgo }
        }
      });

      // API Performance - This would typically come from monitoring tools
      // For now, we'll provide placeholder values
      const apiPerformance = {
        averageResponseTime: 250,  // milliseconds
        errorRate: 0.5,  // 0.5%
        requestsPerMinute: 150
      };

      // Database Health
      const databaseHealth = {
        connectionCount: 10,  // Would come from DB monitoring
        avgQueryTime: 15,  // milliseconds
        slowQueryCount: 2  // queries > 1 second
      };

      // External Services Health
      // WhatsApp success rate (messages sent successfully)
      const whatsappMetrics = await this.calculateWhatsAppHealth();
      
      // Google Sheets sync success rate
      const sheetsMetrics = await this.calculateGoogleSheetsHealth();

      // Email delivery rate
      const emailMetrics = await this.calculateEmailHealth();

      // Determine overall system status
      let status: 'healthy' | 'degraded' | 'down' = 'healthy';
      if (apiPerformance.errorRate > 5 || apiPerformance.averageResponseTime > 1000) {
        status = 'degraded';
      }
      if (apiPerformance.errorRate > 20) {
        status = 'down';
      }

      // Calculate uptime (99.9% target)
      const uptime = 99.95;

      logger.info('System health overview calculated successfully');

      return {
        status,
        uptime,
        activeOrganizations,
        activeUsers,
        apiPerformance,
        databaseHealth,
        externalServices: {
          whatsapp: whatsappMetrics,
          googleSheets: sheetsMetrics,
          email: emailMetrics
        }
      };
    } catch (error) {
      logger.error('Error calculating system health:', error);
      throw new Error('Failed to get system health overview');
    }
  }

  /**
   * Calculate WhatsApp service health
   */
  private async calculateWhatsAppHealth() {
    try {
      // Note: Success rate would come from actual message delivery logs
      // For now using placeholder value
      // Assuming 95% success rate (would come from actual logging)
      const successRate = 95.0;

      return {
        status: successRate > 90 ? 'healthy' : 'degraded',
        successRate
      };
    } catch (error) {
      logger.error('Error calculating WhatsApp health:', error);
      return { status: 'unknown', successRate: 0 };
    }
  }

  /**
   * Calculate Google Sheets service health
   */
  private async calculateGoogleSheetsHealth() {
    try {
      // Count organizations with Google Sheets configured

      // Assuming 98% success rate (would come from sync logs)
      const successRate = 98.0;

      return {
        status: successRate > 90 ? 'healthy' : 'degraded',
        successRate
      };
    } catch (error) {
      logger.error('Error calculating Google Sheets health:', error);
      return { status: 'unknown', successRate: 0 };
    }
  }

  /**
   * Calculate Email service health
   */
  private async calculateEmailHealth() {
    try {
      // Assuming 99% delivery rate (would come from email service logs)
      const deliveryRate = 99.0;

      return {
        status: deliveryRate > 95 ? 'healthy' : 'degraded',
        deliveryRate
      };
    } catch (error) {
      logger.error('Error calculating Email health:', error);
      return { status: 'unknown', deliveryRate: 0 };
    }
  }

  // ==================== SUBTASK-038C-002: Usage Analytics ====================

  /**
   * Get comprehensive platform usage analytics
   * SUBTASK-038C-002-1: Platform usage overview
   */
  async getUsageAnalytics(): Promise<UsageAnalytics> {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Daily Active Organizations (logged in today)
      const dailyActiveOrgs = await prisma.user.groupBy({
        by: ['organizationId'],
        where: {
          lastLoginAt: { gte: oneDayAgo },
          isActive: true
        }
      });

      // Monthly Active Organizations (logged in this month)
      const monthlyActiveOrgs = await prisma.user.groupBy({
        by: ['organizationId'],
        where: {
          lastLoginAt: { gte: oneMonthAgo },
          isActive: true
        }
      });

      const dailyActiveOrgsCount = dailyActiveOrgs.length;
      const monthlyActiveOrgsCount = monthlyActiveOrgs.length;
      const dauMauRatio = monthlyActiveOrgsCount > 0 
        ? (dailyActiveOrgsCount / monthlyActiveOrgsCount) * 100 
        : 0;

      // Total Appointments
      const totalAppointments = await prisma.appointment.count();

      // Appointments by method (would need a field to track booking method)
      const appointmentsByMethod = {
        whatsapp: Math.floor(totalAppointments * 0.7),  // Placeholder: 70% via WhatsApp
        dashboard: Math.floor(totalAppointments * 0.3)   // Placeholder: 30% via Dashboard
      };

      // Feature Adoption
      const totalOrgs = await prisma.organization.count();
      
      const orgsWithWhatsApp = await prisma.organization.count({
        where: {
          whatsappPhoneNumber: { not: null },
          whatsappPhoneVerified: true
        }
      });

      const orgsWithSheets = await prisma.organization.count({
        where: {
          googleSheetsId: { not: null }
        }
      });

      const orgsWithStaff = await prisma.organization.count({
        where: {
          users: {
            some: {
              role: { in: ['STAFF', 'DOCTOR'] }
            }
          }
        }
      });

      const featureAdoption = {
        whatsappSetup: totalOrgs > 0 ? (orgsWithWhatsApp / totalOrgs) * 100 : 0,
        googleSheetsSetup: totalOrgs > 0 ? (orgsWithSheets / totalOrgs) * 100 : 0,
        staffInvitations: totalOrgs > 0 ? (orgsWithStaff / totalOrgs) * 100 : 0
      };

      // Communication Metrics (placeholder - would come from messaging logs)
      const communicationMetrics = {
        whatsappMessagesSent: 15000,
        whatsappMessagesReceived: 8000,
        remindersSent: 5000,
        deliveryRate: 98.5
      };

      // Engagement Metrics
      const loginsToday = await prisma.user.count({
        where: {
          lastLoginAt: { gte: oneDayAgo }
        }
      });

      const loginsThisWeek = await prisma.user.count({
        where: {
          lastLoginAt: { gte: oneWeekAgo }
        }
      });

      const loginsThisMonth = await prisma.user.count({
        where: {
          lastLoginAt: { gte: oneMonthAgo }
        }
      });

      const engagementMetrics = {
        averageSessionDuration: 25,  // Placeholder: 25 minutes average
        loginsToday,
        loginsThisWeek,
        loginsThisMonth
      };

      logger.info('Usage analytics calculated successfully');

      return {
        dailyActiveOrgs: dailyActiveOrgsCount,
        monthlyActiveOrgs: monthlyActiveOrgsCount,
        dauMauRatio,
        totalAppointments,
        appointmentsByMethod,
        featureAdoption,
        communicationMetrics,
        engagementMetrics
      };
    } catch (error) {
      logger.error('Error calculating usage analytics:', error);
      throw new Error('Failed to get usage analytics');
    }
  }

  // ==================== SUBTASK-038C-003: Growth & Conversion Analytics ====================

  /**
   * Get growth and conversion metrics
   * SUBTASK-038C-003: Registration funnel, trial conversion, growth rates
   */
  async getGrowthAnalytics(): Promise<GrowthAnalytics> {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      // ========== REGISTRATION FUNNEL ==========
      
      // Total signups (all organizations)
      const totalSignups = await prisma.organization.count();

      // Email verified (have email)
      const emailVerified = await prisma.organization.count({
        where: {
          email: { not: '' }
        }
      });

      // WhatsApp configured
      const whatsappConfigured = await prisma.organization.count({
        where: {
          whatsappPhoneNumber: { not: null },
          whatsappPhoneVerified: true
        }
      });

      // Google Sheets configured
      const sheetsConfigured = await prisma.organization.count({
        where: {
          googleSheetsId: { not: null }
        }
      });

      // Active users (have appointments or activity)
      const activeUsers = await prisma.organization.count({
        where: {
          isActive: true,
          subscriptionStatus: 'ACTIVE'
        }
      });

      const conversionRate = totalSignups > 0 
        ? (activeUsers / totalSignups) * 100 
        : 0;

      const registrationFunnel = {
        signups: totalSignups,
        emailVerified,
        whatsappConfigured,
        sheetsConfigured,
        activeUsers,
        conversionRate
      };

      // ========== TRIAL CONVERSION ==========

      const totalTrials = await prisma.trialHistory.count();

      const convertedTrials = await prisma.organization.count({
        where: {
          subscriptionStatus: 'ACTIVE',
          subscriptionPlan: { not: 'FREE' }
        }
      });

      const cancelledTrials = await prisma.organization.count({
        where: {
          subscriptionStatus: 'CANCELLED'
        }
      });

      const trialConversionRate = totalTrials > 0 
        ? (convertedTrials / totalTrials) * 100 
        : 0;

      const trialConversion = {
        totalTrials,
        converted: convertedTrials,
        cancelled: cancelledTrials,
        conversionRate: trialConversionRate,
        averageDaysToConvert: 12  // Placeholder - would need conversion date tracking
      };

      // ========== GROWTH METRICS ==========

      // Organization Growth
      const totalOrgs = await prisma.organization.count();

      const newOrgsToday = await prisma.organization.count({
        where: {
          createdAt: { gte: oneDayAgo }
        }
      });

      const newOrgsThisWeek = await prisma.organization.count({
        where: {
          createdAt: { gte: oneWeekAgo }
        }
      });

      const newOrgsThisMonth = await prisma.organization.count({
        where: {
          createdAt: { gte: oneMonthAgo }
        }
      });

      const orgsLastMonth = await prisma.organization.count({
        where: {
          createdAt: { gte: twoMonthsAgo, lt: oneMonthAgo }
        }
      });

      const monthOverMonthGrowth = orgsLastMonth > 0 
        ? ((newOrgsThisMonth - orgsLastMonth) / orgsLastMonth) * 100 
        : 0;

      // User Growth
      const totalUsers = await prisma.user.count();

      const newUsersToday = await prisma.user.count({
        where: {
          createdAt: { gte: oneDayAgo }
        }
      });

      const newUsersThisWeek = await prisma.user.count({
        where: {
          createdAt: { gte: oneWeekAgo }
        }
      });

      const newUsersThisMonth = await prisma.user.count({
        where: {
          createdAt: { gte: oneMonthAgo }
        }
      });

      // Revenue Growth (placeholder - would integrate with billing service)
      const revenueGrowth = {
        mrr: 50000,  // Placeholder
        mrrGrowth: 15.5  // Placeholder: 15.5% growth
      };

      const growthMetrics = {
        organizationGrowth: {
          total: totalOrgs,
          newToday: newOrgsToday,
          newThisWeek: newOrgsThisWeek,
          newThisMonth: newOrgsThisMonth,
          monthOverMonthGrowth
        },
        userGrowth: {
          total: totalUsers,
          newToday: newUsersToday,
          newThisWeek: newUsersThisWeek,
          newThisMonth: newUsersThisMonth
        },
        revenueGrowth
      };

      // ========== COHORT RETENTION ==========
      // Placeholder - would need cohort analysis implementation
      const cohortRetention = {
        month0: 100,
        month1: 85,
        month3: 70,
        month6: 60,
        month12: 50
      };

      logger.info('Growth analytics calculated successfully');

      return {
        registrationFunnel,
        trialConversion,
        growthMetrics,
        cohortRetention
      };
    } catch (error) {
      logger.error('Error calculating growth analytics:', error);
      throw new Error('Failed to get growth analytics');
    }
  }

  // ==================== SUBTASK-038C-004: Performance Benchmarking ====================

  /**
   * Get performance benchmarks across organizations
   * SUBTASK-038C-004-1: Performance benchmarks by percentiles
   */
  async getPerformanceBenchmarks(): Promise<PerformanceBenchmarks> {
    try {
      // Get appointment counts per organization
      const appointmentCounts = await prisma.appointment.groupBy({
        by: ['organizationId'],
        _count: { id: true }
      });

      const appointmentCountsArray = appointmentCounts.map(a => a._count.id).sort((a, b) => a - b);

      // Get patient counts per organization
      const patientCounts = await prisma.patient.groupBy({
        by: ['organizationId'],
        _count: { id: true }
      });

      const patientCountsArray = patientCounts.map(p => p._count.id).sort((a, b) => a - b);

      // Calculate percentiles
      const appointmentsPerOrg = {
        p25: this.calculatePercentile(appointmentCountsArray, 25),
        p50: this.calculatePercentile(appointmentCountsArray, 50),
        p75: this.calculatePercentile(appointmentCountsArray, 75),
        p95: this.calculatePercentile(appointmentCountsArray, 95)
      };

      const patientsPerOrg = {
        p25: this.calculatePercentile(patientCountsArray, 25),
        p50: this.calculatePercentile(patientCountsArray, 50),
        p75: this.calculatePercentile(patientCountsArray, 75),
        p95: this.calculatePercentile(patientCountsArray, 95)
      };

      // Placeholder for messages per org
      const messagesPerOrg = {
        p25: 50,
        p50: 150,
        p75: 300,
        p95: 800
      };

      // Get top 10% high performers
      const threshold = appointmentsPerOrg.p95;
      const highPerformerOrgs = await prisma.organization.findMany({
        where: {
          id: {
            in: appointmentCounts
              .filter(a => a._count.id >= threshold)
              .map(a => a.organizationId)
              .slice(0, 10)
          }
        },
        select: {
          id: true,
          name: true
        }
      });

      const highPerformers = highPerformerOrgs.map(org => ({
        organizationId: org.id,
        name: org.name,
        metrics: {
          appointmentsPerMonth: 250,  // Placeholder
          patientsTotal: 500,  // Placeholder
          messagesPerDay: 50  // Placeholder
        }
      }));

      // Get low performers (organizations with issues)
      const lowPerformerOrgs = await prisma.organization.findMany({
        where: {
          isActive: true,
          OR: [
            { whatsappPhoneNumber: null },
            { googleSheetsId: null },
            { whatsappPhoneVerified: false }
          ]
        },
        take: 10,
        select: {
          id: true,
          name: true,
          whatsappPhoneNumber: true,
          googleSheetsId: true,
          whatsappPhoneVerified: true
        }
      });

      const lowPerformers = lowPerformerOrgs.map(org => {
        const issues = [];
        if (!org.whatsappPhoneNumber) issues.push('WhatsApp not configured');
        if (!org.googleSheetsId) issues.push('Google Sheets not configured');
        if (!org.whatsappPhoneVerified) issues.push('Phone not verified');

        return {
          organizationId: org.id,
          name: org.name,
          issueType: issues.join(', '),
          suggestions: [
            'Complete setup wizard',
            'Configure missing integrations',
            'Verify phone number'
          ]
        };
      });

      logger.info('Performance benchmarks calculated successfully');

      return {
        appointmentsPerOrg,
        patientsPerOrg,
        messagesPerOrg,
        highPerformers,
        lowPerformers
      };
    } catch (error) {
      logger.error('Error calculating performance benchmarks:', error);
      throw new Error('Failed to get performance benchmarks');
    }
  }

  /**
   * Calculate percentile from sorted array
   */
  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    const value = sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
    return value !== undefined ? value : 0;
  }
}

export default new PlatformAnalyticsService();
