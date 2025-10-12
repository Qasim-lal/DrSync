import { PrismaClient } from '../generated/prisma';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Trial Management Service
 * Handles trial overview, abuse detection, and trial lifecycle management
 * TASK-038B-004: Trial Management & Abuse Prevention
 */

export interface TrialOverview {
  activeTrials: number;
  conversionRate: number;
  averageDaysToConvert: number;
  expiringToday: number;
  expiringSoon: number;  // Next 7 days
  expired: number;  // Last 7 days
  totalTrialsStarted: number;
  totalConverted: number;
}

export interface AbuseDetectionResult {
  suspiciousOrganizations: Array<{
    organizationId: string;
    organizationName: string;
    phoneNumber: string;
    email: string;
    riskScore: number;
    reasons: string[];
    registeredAt: Date;
  }>;
  totalFlagged: number;
  abuseStats: {
    duplicatePhones: number;
    duplicateEmails: number;
    multipleTrials: number;
  };
}

export interface TrialUsageLimits {
  organizationId: string;
  organizationName: string;
  maxPatients: number;
  currentPatients: number;
  maxAppointments: number;
  currentAppointments: number;
  patientsUsagePercent: number;
  appointmentsUsagePercent: number;
  isNearLimit: boolean;
  isOverLimit: boolean;
}

class TrialManagementService {
  /**
   * SUBTASK-038B-004-1: Get trial overview dashboard
   */
  async getTrialOverview(): Promise<TrialOverview> {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Count active trials
      const activeTrials = await prisma.organization.count({
        where: {
          subscriptionStatus: 'TRIAL',
          isActive: true
        }
      });

      // Count trials expiring today
      const expiringToday = await prisma.organization.count({
        where: {
          subscriptionStatus: 'TRIAL',
          subscriptionEndsAt: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
          }
        }
      });

      // Count trials expiring in next 7 days
      const expiringSoon = await prisma.organization.count({
        where: {
          subscriptionStatus: 'TRIAL',
          subscriptionEndsAt: {
            gte: today,
            lt: sevenDaysFromNow
          }
        }
      });

      // Count recently expired trials (last 7 days)
      const expired = await prisma.organization.count({
        where: {
          subscriptionStatus: { in: ['CANCELLED', 'PAST_DUE'] },
          subscriptionEndsAt: {
            gte: sevenDaysAgo,
            lt: today
          }
        }
      });

      // Total trials ever started
      const totalTrialsStarted = await prisma.trialHistory.count();

      // Calculate conversions (organizations that moved from TRIAL to ACTIVE)
      // This is an approximation - ideally we'd track this in a separate table
      const currentlyActive = await prisma.organization.count({
        where: {
          subscriptionStatus: 'ACTIVE'
        }
      });

      // Conversion rate calculation (simplified)
      const totalConverted = currentlyActive;  // Approximation
      const conversionRate = totalTrialsStarted > 0
        ? (totalConverted / totalTrialsStarted) * 100
        : 0;

      // Average days to convert (would need better tracking)
      const averageDaysToConvert = 14;  // Placeholder - needs historical data

      logger.info(`Trial overview: ${activeTrials} active, ${expiringSoon} expiring soon, ${conversionRate.toFixed(2)}% conversion`);

      return {
        activeTrials,
        conversionRate,
        averageDaysToConvert,
        expiringToday,
        expiringSoon,
        expired,
        totalTrialsStarted,
        totalConverted
      };
    } catch (error) {
      logger.error('Error getting trial overview:', error);
      throw new Error('Failed to get trial overview');
    }
  }

  /**
   * SUBTASK-038B-004-2: Detect trial abuse patterns
   */
  async detectTrialAbuse(): Promise<AbuseDetectionResult> {
    try {
      const suspiciousOrganizations: AbuseDetectionResult['suspiciousOrganizations'] = [];

      // Get all trial history entries
      const trialHistory = await prisma.trialHistory.findMany({
        orderBy: { createdAt: 'desc' }
      });

      // Find duplicate phone numbers
      const phoneMap = new Map<string, typeof trialHistory>();
      const duplicatePhones = new Set<string>();

      for (const trial of trialHistory) {
        if (phoneMap.has(trial.phoneNumber)) {
          duplicatePhones.add(trial.phoneNumber);
          phoneMap.get(trial.phoneNumber)!.push(trial);
        } else {
          phoneMap.set(trial.phoneNumber, [trial]);
        }
      }

      // Find duplicate emails
      const emailMap = new Map<string, typeof trialHistory>();
      const duplicateEmails = new Set<string>();

      for (const trial of trialHistory) {
        if (emailMap.has(trial.email)) {
          duplicateEmails.add(trial.email);
          emailMap.get(trial.email)!.push(trial);
        } else {
          emailMap.set(trial.email, [trial]);
        }
      }

      // Flag suspicious organizations
      for (const [phone, trials] of phoneMap) {
        if (trials.length > 1) {
          // Multiple trials with same phone
          for (const trial of trials) {
            const reasons: string[] = [];
            let riskScore = 0;

            if (trials.length > 1) {
              reasons.push(`${trials.length} trials with phone ${phone}`);
              riskScore += trials.length * 20;
            }

            if (duplicateEmails.has(trial.email)) {
              reasons.push(`Email ${trial.email} used in multiple trials`);
              riskScore += 30;
            }

            if (!trial.phoneVerified) {
              reasons.push('Phone not verified');
              riskScore += 15;
            }

            // Find the corresponding organization
            const org = await prisma.organization.findFirst({
              where: {
                OR: [
                  { phone: phone },
                  { email: trial.email }
                ]
              }
            });

            if (org && riskScore > 30) {
              suspiciousOrganizations.push({
                organizationId: org.id,
                organizationName: org.name,
                phoneNumber: phone,
                email: trial.email,
                riskScore: Math.min(riskScore, 100),
                reasons,
                registeredAt: trial.createdAt
              });
            }
          }
        }
      }

      // Remove duplicates and sort by risk score
      const uniqueSuspicious = Array.from(
        new Map(suspiciousOrganizations.map(item => [item.organizationId, item])).values()
      ).sort((a, b) => b.riskScore - a.riskScore);

      logger.warn(`Detected ${uniqueSuspicious.length} suspicious organizations`);

      return {
        suspiciousOrganizations: uniqueSuspicious,
        totalFlagged: uniqueSuspicious.length,
        abuseStats: {
          duplicatePhones: duplicatePhones.size,
          duplicateEmails: duplicateEmails.size,
          multipleTrials: uniqueSuspicious.length
        }
      };
    } catch (error) {
      logger.error('Error detecting trial abuse:', error);
      throw new Error('Failed to detect trial abuse');
    }
  }

  /**
   * SUBTASK-038B-004-3: Monitor trial usage limits
   */
  async monitorTrialUsage(): Promise<TrialUsageLimits[]> {
    try {
      const trialOrgs = await prisma.organization.findMany({
        where: {
          subscriptionStatus: 'TRIAL',
          isActive: true
        },
        include: {
          _count: {
            select: {
              patients: true,
              appointments: true
            }
          }
        }
      });

      const usageLimits: TrialUsageLimits[] = [];

      for (const org of trialOrgs) {
        const maxPatients = org.maxPatients || 25;  // Default trial limit
        const maxAppointments = org.maxAppointments || 50;  // Default trial limit

        const currentPatients = org._count.patients;
        const currentAppointments = org._count.appointments;

        const patientsUsagePercent = (currentPatients / maxPatients) * 100;
        const appointmentsUsagePercent = (currentAppointments / maxAppointments) * 100;

        const isNearLimit = patientsUsagePercent >= 80 || appointmentsUsagePercent >= 80;
        const isOverLimit = patientsUsagePercent >= 100 || appointmentsUsagePercent >= 100;

        usageLimits.push({
          organizationId: org.id,
          organizationName: org.name,
          maxPatients,
          currentPatients,
          maxAppointments,
          currentAppointments,
          patientsUsagePercent,
          appointmentsUsagePercent,
          isNearLimit,
          isOverLimit
        });
      }

      // Log alerts for organizations near or over limits
      const nearLimit = usageLimits.filter(u => u.isNearLimit && !u.isOverLimit).length;
      const overLimit = usageLimits.filter(u => u.isOverLimit).length;

      logger.info(`Trial usage: ${nearLimit} near limit, ${overLimit} over limit`);

      return usageLimits.sort((a, b) => {
        if (a.isOverLimit && !b.isOverLimit) return -1;
        if (!a.isOverLimit && b.isOverLimit) return 1;
        return b.patientsUsagePercent - a.patientsUsagePercent;
      });
    } catch (error) {
      logger.error('Error monitoring trial usage:', error);
      throw new Error('Failed to monitor trial usage');
    }
  }

  /**
   * SUBTASK-038B-004-4: Extend trial period
   */
  async extendTrial(
    organizationId: string,
    extensionDays: number,
    reason: string
  ): Promise<any> {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId }
      });

      if (!org) {
        throw new Error('Organization not found');
      }

      if (org.subscriptionStatus !== 'TRIAL') {
        throw new Error('Organization is not in trial period');
      }

      const currentEndDate = org.subscriptionEndsAt || new Date();
      const newEndDate = new Date(currentEndDate.getTime() + extensionDays * 24 * 60 * 60 * 1000);

      const updated = await prisma.organization.update({
        where: { id: organizationId },
        data: {
          subscriptionEndsAt: newEndDate,
          updatedAt: new Date()
        }
      });

      logger.info(
        `Trial extended for ${org.name} (${organizationId}) by ${extensionDays} days. Reason: ${reason}`
      );

      // TODO: Send email notification to organization

      return updated;
    } catch (error) {
      logger.error(`Error extending trial for ${organizationId}:`, error);
      throw error;
    }
  }

  /**
   * SUBTASK-038B-004-5: Get trial conversion tracking
   */
  async getTrialConversions(days: number = 30): Promise<any> {
    try {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Get organizations that started trial in the period
      const trialsStarted = await prisma.organization.count({
        where: {
          createdAt: { gte: cutoffDate }
        }
      });

      // Get organizations that converted (moved to ACTIVE)
      const converted = await prisma.organization.count({
        where: {
          createdAt: { gte: cutoffDate },
          subscriptionStatus: 'ACTIVE'
        }
      });

      // Get organizations still in trial
      const stillInTrial = await prisma.organization.count({
        where: {
          createdAt: { gte: cutoffDate },
          subscriptionStatus: 'TRIAL'
        }
      });

      // Get organizations that cancelled
      const cancelled = await prisma.organization.count({
        where: {
          createdAt: { gte: cutoffDate },
          subscriptionStatus: { in: ['CANCELLED', 'PAST_DUE'] }
        }
      });

      const conversionRate = trialsStarted > 0
        ? (converted / trialsStarted) * 100
        : 0;

      logger.info(`Trial conversions (last ${days} days): ${converted}/${trialsStarted} (${conversionRate.toFixed(2)}%)`);

      return {
        period: `Last ${days} days`,
        trialsStarted,
        converted,
        stillInTrial,
        cancelled,
        conversionRate,
        metrics: {
          conversionRate: `${conversionRate.toFixed(2)}%`,
          cancelRate: `${trialsStarted > 0 ? ((cancelled / trialsStarted) * 100).toFixed(2) : 0}%`,
          activeTrialRate: `${trialsStarted > 0 ? ((stillInTrial / trialsStarted) * 100).toFixed(2) : 0}%`
        }
      };
    } catch (error) {
      logger.error('Error tracking trial conversions:', error);
      throw new Error('Failed to track trial conversions');
    }
  }

  /**
   * SUBTASK-038B-004-7: Handle trial end actions
   */
  async getTrialsEndingActions(): Promise<any> {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Trials expiring today
      const expiringToday = await prisma.organization.findMany({
        where: {
          subscriptionStatus: 'TRIAL',
          subscriptionEndsAt: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
          }
        },
        select: {
          id: true,
          name: true,
          email: true,
          subscriptionEndsAt: true
        }
      });

      // Recently expired (last 7 days)
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const recentlyExpired = await prisma.organization.findMany({
        where: {
          subscriptionStatus: { in: ['TRIAL', 'PAST_DUE'] },
          subscriptionEndsAt: {
            gte: sevenDaysAgo,
            lt: today
          }
        },
        select: {
          id: true,
          name: true,
          email: true,
          subscriptionEndsAt: true,
          subscriptionStatus: true
        }
      });

      logger.info(`Trial end actions: ${expiringToday.length} expiring today, ${recentlyExpired.length} recently expired`);

      return {
        expiringToday: {
          count: expiringToday.length,
          organizations: expiringToday
        },
        recentlyExpired: {
          count: recentlyExpired.length,
          organizations: recentlyExpired
        },
        recommendedActions: {
          expiringToday: 'Send conversion offer emails',
          recentlyExpired: 'Send win-back campaign or downgrade to FREE plan'
        }
      };
    } catch (error) {
      logger.error('Error getting trial end actions:', error);
      throw new Error('Failed to get trial end actions');
    }
  }
}

// Export singleton instance
export const trialManagementService = new TrialManagementService();
