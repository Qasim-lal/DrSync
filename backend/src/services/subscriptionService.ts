/**
 * Subscription Management Service for DrSync Billing System
 * 
 * Features:
 * - Per-doctor pricing (Rs. 3,000/month or $20/month per doctor)
 * - 17% discount for yearly subscriptions
 * - Trial abuse prevention with phone verification
 * - Automatic billing processing
 * - Usage tracking and billing adjustments
 * 
 * @author DrSync Development Team
 * @version 1.0.0
 */

import { PrismaClient, Organization, TrialHistory, SubscriptionStatus } from '../generated/prisma';
import { logger } from '../utils/logger';
import PaymentService, { PRICING_CONFIG } from './paymentService';

const prisma = new PrismaClient();

// Trial limits
export const TRIAL_LIMITS = {
  maxPatients: 25,
  maxAppointments: 50,
  durationDays: 14, // 14-day trial period
};

// Subscription interfaces
interface SubscriptionCalculation {
  doctorCount: number;
  monthlyAmount: number;
  yearlyAmount: number;
  yearlyDiscount: number;
  currency: string;
  region: string;
}

interface TrialRegistrationRequest {
  phoneNumber: string;
  email: string;
  organizationName: string;
  organizationId: string;
  ipAddress?: string;
  userAgent?: string;
}

interface SubscriptionUpdateRequest {
  organizationId: string;
  doctorCount?: number;
  subscriptionType?: 'MONTHLY' | 'YEARLY';
  paymentMethod?: string;
}

interface BillingCycleResult {
  organizationsProcessed: number;
  successfulPayments: number;
  failedPayments: number;
  errors: string[];
}

export class SubscriptionService {
  /**
   * Calculate subscription pricing for an organization
   */
  static calculateSubscriptionPricing(
    doctorCount: number,
    region: string = 'PAKISTAN'
  ): SubscriptionCalculation {
    const currency = region === 'PAKISTAN' ? 'PKR' : 'USD';
    const config = PRICING_CONFIG[currency];

    if (!config) {
      throw new Error(`Unsupported region/currency: ${region}/${currency}`);
    }

    const monthlyAmount = config.perDoctorMonthly * doctorCount;
    const yearlyAmount = config.perDoctorYearly * doctorCount;
    const yearlyDiscount = Math.round(((monthlyAmount * 12) - yearlyAmount) / (monthlyAmount * 12) * 100);

    return {
      doctorCount,
      monthlyAmount,
      yearlyAmount,
      yearlyDiscount,
      currency,
      region,
    };
  }

  /**
   * Check if phone number is eligible for trial (anti-abuse)
   */
  static async checkTrialEligibility(phoneNumber: string, email: string): Promise<{
    eligible: boolean;
    reason?: string;
    existingTrial?: TrialHistory;
  }> {
    try {
      // Check if phone number has already used a trial
      const existingTrialByPhone = await prisma.trialHistory.findUnique({
        where: { phoneNumber },
      });

      if (existingTrialByPhone) {
        return {
          eligible: false,
          reason: 'Phone number has already been used for a trial',
          existingTrial: existingTrialByPhone,
        };
      }

      // Check if email has been used for trial (less strict, just tracking)
      const existingTrialByEmail = await prisma.trialHistory.findFirst({
        where: { email },
      });

      if (existingTrialByEmail) {
        logger.warn('Email has been used for previous trial', { 
          email, 
          phoneNumber, 
          existingTrialId: existingTrialByEmail.id 
        });
        // Still allow trial but log for monitoring
      }

      return { eligible: true };

    } catch (error) {
      logger.error('Trial eligibility check failed', { error: (error as Error).message, phoneNumber, email });
      return {
        eligible: false,
        reason: 'Unable to verify trial eligibility',
      };
    }
  }

  /**
   * Register trial usage to prevent abuse
   */
  static async registerTrialUsage(request: TrialRegistrationRequest): Promise<TrialHistory> {
    try {
      const createData: any = {
        phoneNumber: request.phoneNumber,
        email: request.email,
        organizationName: request.organizationName,
        phoneVerified: false, // Will be verified separately
      };
      
      if (request.ipAddress) {
        createData.ipAddress = request.ipAddress;
      }
      
      if (request.userAgent) {
        createData.userAgent = request.userAgent;
      }
      
      const trialRecord = await prisma.trialHistory.create({
        data: createData,
      });

      logger.info('Trial usage registered', { 
        trialId: trialRecord.id,
        phoneNumber: request.phoneNumber,
        organizationId: request.organizationId 
      });

      return trialRecord;

    } catch (error) {
      logger.error('Failed to register trial usage', { error: (error as Error).message, request });
      throw new Error('Failed to register trial usage');
    }
  }

  /**
   * Verify phone number for trial abuse prevention
   */
  static async verifyTrialPhoneNumber(phoneNumber: string, verificationCode: string): Promise<boolean> {
    try {
      // Mock phone verification - in production, integrate with SMS/WhatsApp API
      const isValid = verificationCode === '123456'; // Mock verification code

      if (isValid) {
        await prisma.trialHistory.update({
          where: { phoneNumber },
          data: { phoneVerified: true },
        });

        logger.info('Phone number verified for trial', { phoneNumber });
        return true;
      }

      logger.warn('Invalid verification code for trial phone', { phoneNumber });
      return false;

    } catch (error) {
      logger.error('Phone verification failed', { error: (error as Error).message, phoneNumber });
      return false;
    }
  }

  /**
   * Start trial period for organization
   */
  static async startTrialPeriod(organizationId: string): Promise<Organization> {
    try {
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + TRIAL_LIMITS.durationDays);

      const organization = await prisma.organization.update({
        where: { id: organizationId },
        data: {
          subscriptionStatus: 'TRIAL',
          subscriptionEndsAt: trialEndDate,
        },
      });

      logger.info('Trial period started', { 
        organizationId,
        trialEndDate: trialEndDate.toISOString() 
      });

      return organization;

    } catch (error) {
      logger.error('Failed to start trial period', { error: (error as Error).message, organizationId });
      throw new Error('Failed to start trial period');
    }
  }

  /**
   * Check if organization has exceeded trial limits
   */
  static async checkTrialLimits(organizationId: string): Promise<{
    withinLimits: boolean;
    currentUsage: {
      patients: number;
      appointments: number;
    };
    limits: typeof TRIAL_LIMITS;
  }> {
    try {
      const [patientCount, appointmentCount] = await Promise.all([
        prisma.patient.count({ where: { organizationId } }),
        prisma.appointment.count({ where: { organizationId } }),
      ]);

      const withinLimits = 
        patientCount <= TRIAL_LIMITS.maxPatients &&
        appointmentCount <= TRIAL_LIMITS.maxAppointments;

      return {
        withinLimits,
        currentUsage: {
          patients: patientCount,
          appointments: appointmentCount,
        },
        limits: TRIAL_LIMITS,
      };

    } catch (error) {
      logger.error('Failed to check trial limits', { error: (error as Error).message, organizationId });
      throw new Error('Failed to check trial limits');
    }
  }

  /**
   * Update subscription for organization
   */
  static async updateSubscription(request: SubscriptionUpdateRequest): Promise<Organization> {
    try {
      const updateData: any = {};

      // Update doctor count if provided
      if (request.doctorCount !== undefined) {
        updateData.doctorCount = request.doctorCount;
      }

      // Update subscription type if provided
      if (request.subscriptionType) {
        updateData.subscriptionType = request.subscriptionType;

        // Calculate next billing date
        const nextBilling = new Date();
        if (request.subscriptionType === 'YEARLY') {
          nextBilling.setFullYear(nextBilling.getFullYear() + 1);
        } else {
          nextBilling.setMonth(nextBilling.getMonth() + 1);
        }
        updateData.nextBillingDate = nextBilling;
      }

      // Update payment method if provided
      if (request.paymentMethod) {
        updateData.paymentMethod = request.paymentMethod;
      }

      const organization = await prisma.organization.update({
        where: { id: request.organizationId },
        data: updateData,
      });

      logger.info('Subscription updated', { 
        organizationId: request.organizationId,
        updates: updateData 
      });

      return organization;

    } catch (error) {
      logger.error('Failed to update subscription', { error: (error as Error).message, request });
      throw new Error('Failed to update subscription');
    }
  }

  /**
   * Activate paid subscription (convert from trial)
   */
  static async activateSubscription(
    organizationId: string,
    subscriptionType: 'MONTHLY' | 'YEARLY',
    paymentMethod: string
  ): Promise<Organization> {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        throw new Error('Organization not found');
      }

      // Calculate subscription end date
      const subscriptionEndDate = new Date();
      if (subscriptionType === 'YEARLY') {
        subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);
      } else {
        subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
      }

      // Calculate next billing date
      const nextBillingDate = new Date(subscriptionEndDate);

      const updatedOrganization = await prisma.organization.update({
        where: { id: organizationId },
        data: {
          subscriptionStatus: 'ACTIVE',
          subscriptionPlan: 'PROFESSIONAL', // Default to professional
          subscriptionEndsAt: subscriptionEndDate,
          subscriptionType,
          paymentMethod,
          nextBillingDate,
          lastBilledAt: new Date(),
        },
      });

      logger.info('Subscription activated', { 
        organizationId,
        subscriptionType,
        subscriptionEndDate: subscriptionEndDate.toISOString() 
      });

      return updatedOrganization;

    } catch (error) {
      logger.error('Failed to activate subscription', { error: (error as Error).message, organizationId });
      throw new Error('Failed to activate subscription');
    }
  }

  /**
   * Process automatic billing for all active subscriptions
   */
  static async processAutomaticBilling(): Promise<BillingCycleResult> {
    const result: BillingCycleResult = {
      organizationsProcessed: 0,
      successfulPayments: 0,
      failedPayments: 0,
      errors: [],
    };

    try {
      logger.info('Starting automatic billing cycle');

      // Find organizations that need billing
      const organizationsToBill = await prisma.organization.findMany({
        where: {
          subscriptionStatus: 'ACTIVE',
          nextBillingDate: {
            lte: new Date(), // Due for billing
          },
        },
        include: {
          billingHistory: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      logger.info(`Found ${organizationsToBill.length} organizations to bill`);

      for (const organization of organizationsToBill) {
        result.organizationsProcessed++;

        try {
          // Calculate billing amount
          const currency = organization.region === 'PAKISTAN' ? 'PKR' : 'USD';
          const amount = PaymentService.calculateSubscriptionAmount(
            organization.doctorCount,
            organization.subscriptionType as 'MONTHLY' | 'YEARLY',
            currency as 'PKR' | 'USD'
          );

          // Generate billing period
          const now = new Date();
          const billingPeriod = organization.subscriptionType === 'YEARLY' 
            ? now.getFullYear().toString()
            : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

          // Process payment
          const paymentResult = await PaymentService.createPaymentIntent({
            organizationId: organization.id,
            amount,
            currency,
            paymentMethod: organization.paymentMethod || 'BANK_TRANSFER',
            billingPeriod,
            subscriptionType: organization.subscriptionType as 'MONTHLY' | 'YEARLY',
            doctorCount: organization.doctorCount,
            description: `DrSync subscription - ${billingPeriod}`,
          });

          if (paymentResult.success) {
            result.successfulPayments++;

            // Update next billing date
            const nextBilling = new Date();
            if (organization.subscriptionType === 'YEARLY') {
              nextBilling.setFullYear(nextBilling.getFullYear() + 1);
            } else {
              nextBilling.setMonth(nextBilling.getMonth() + 1);
            }

            await prisma.organization.update({
              where: { id: organization.id },
              data: {
                lastBilledAt: now,
                nextBillingDate: nextBilling,
              },
            });

            logger.info('Billing successful', { 
              organizationId: organization.id,
              amount,
              currency,
              paymentIntentId: paymentResult.paymentIntentId 
            });

          } else {
            result.failedPayments++;
            result.errors.push(`Payment failed for ${organization.name}: ${paymentResult.errorMessage}`);

            // Update subscription status to PAST_DUE
            await prisma.organization.update({
              where: { id: organization.id },
              data: {
                subscriptionStatus: 'PAST_DUE',
              },
            });

            logger.error('Billing failed', { 
              organizationId: organization.id,
              error: paymentResult.errorMessage 
            });
          }

        } catch (error) {
          result.failedPayments++;
          result.errors.push(`Billing error for ${organization.name}: ${(error as Error).message}`);
          logger.error('Organization billing failed', { 
            organizationId: organization.id,
            error: (error as Error).message 
          });
        }
      }

      logger.info('Automatic billing cycle completed', result);
      return result;

    } catch (error) {
      logger.error('Automatic billing cycle failed', { error: (error as Error).message });
      result.errors.push(`Billing cycle failed: ${(error as Error).message}`);
      return result;
    }
  }

  /**
   * Suspend organization for non-payment
   */
  static async suspendForNonPayment(organizationId: string, reason: string): Promise<Organization> {
    try {
      const organization = await prisma.organization.update({
        where: { id: organizationId },
        data: {
          subscriptionStatus: 'SUSPENDED',
          isActive: false,
        },
      });

      // Log suspension
      logger.warn('Organization suspended for non-payment', { 
        organizationId,
        reason,
        suspendedAt: new Date().toISOString() 
      });

      return organization;

    } catch (error) {
      logger.error('Failed to suspend organization', { error: (error as Error).message, organizationId });
      throw new Error('Failed to suspend organization');
    }
  }

  /**
   * Reactivate suspended organization after payment
   */
  static async reactivateSubscription(organizationId: string): Promise<Organization> {
    try {
      const organization = await prisma.organization.update({
        where: { id: organizationId },
        data: {
          subscriptionStatus: 'ACTIVE',
          isActive: true,
        },
      });

      logger.info('Organization subscription reactivated', { organizationId });
      return organization;

    } catch (error) {
      logger.error('Failed to reactivate subscription', { error: (error as Error).message, organizationId });
      throw new Error('Failed to reactivate subscription');
    }
  }

  /**
   * Get subscription usage statistics
   */
  static async getSubscriptionUsage(organizationId: string): Promise<{
    currentPeriod: {
      patients: number;
      appointments: number;
      providers: number;
    };
    limits: {
      patients: number;
      appointments: number;
    };
    billingInfo: {
      nextBillingDate: Date | null;
      lastBilledAt: Date | null;
      subscriptionStatus: SubscriptionStatus;
      subscriptionType: string | null;
      doctorCount: number;
    };
  }> {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        throw new Error('Organization not found');
      }

      const [patientCount, appointmentCount, providerCount] = await Promise.all([
        prisma.patient.count({ where: { organizationId } }),
        prisma.appointment.count({ where: { organizationId } }),
        prisma.provider.count({ where: { organizationId } }),
      ]);

      // Determine limits based on subscription status
      const isTrialOrg = organization.subscriptionStatus === 'TRIAL';
      const patientLimit = isTrialOrg ? TRIAL_LIMITS.maxPatients : Infinity;
      const appointmentLimit = isTrialOrg ? TRIAL_LIMITS.maxAppointments : Infinity;

      return {
        currentPeriod: {
          patients: patientCount,
          appointments: appointmentCount,
          providers: providerCount,
        },
        limits: {
          patients: patientLimit,
          appointments: appointmentLimit,
        },
        billingInfo: {
          nextBillingDate: organization.nextBillingDate,
          lastBilledAt: organization.lastBilledAt,
          subscriptionStatus: organization.subscriptionStatus,
          subscriptionType: organization.subscriptionType,
          doctorCount: organization.doctorCount,
        },
      };

    } catch (error) {
      logger.error('Failed to get subscription usage', { error: (error as Error).message, organizationId });
      throw new Error('Failed to get subscription usage');
    }
  }

  /**
   * Check organizations due for billing suspension
   */
  static async checkOverduePayments(): Promise<void> {
    try {
      const overdueOrganizations = await prisma.organization.findMany({
        where: {
          subscriptionStatus: 'PAST_DUE',
          nextBillingDate: {
            lt: new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)), // 7 days overdue
          },
        },
      });

      for (const organization of overdueOrganizations) {
        await this.suspendForNonPayment(
          organization.id,
          'Payment overdue for more than 7 days'
        );
      }

      if (overdueOrganizations.length > 0) {
        logger.warn(`Suspended ${overdueOrganizations.length} organizations for overdue payments`);
      }

    } catch (error) {
      logger.error('Failed to check overdue payments', { error: (error as Error).message });
    }
  }
}

export default SubscriptionService;