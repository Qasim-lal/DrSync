/**
 * Billing Controller for DrSync Billing System API
 * 
 * API Endpoints:
 * - Subscription management
 * - Payment processing
 * - Billing history
 * - Trial tracking and abuse prevention
 * - Admin billing dashboard
 * 
 * @author DrSync Development Team
 * @version 1.0.0
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger';
import PaymentService from '../services/paymentService';
import SubscriptionService, { TRIAL_LIMITS } from '../services/subscriptionService';
import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const TrialEligibilitySchema = z.object({
  phoneNumber: z.string().min(10).max(15),
  email: z.string().email(),
});

const TrialRegistrationSchema = z.object({
  phoneNumber: z.string().min(10).max(15),
  email: z.string().email(),
  organizationName: z.string().min(1).max(255),
});

const PhoneVerificationSchema = z.object({
  phoneNumber: z.string().min(10).max(15),
  verificationCode: z.string().length(6),
});

const SubscriptionCalculationSchema = z.object({
  doctorCount: z.number().int().min(1).max(100),
  region: z.enum(['PAKISTAN', 'INTERNATIONAL']).optional().default('PAKISTAN'),
});

const PaymentIntentSchema = z.object({
  amount: z.number().positive(),
  currency: z.enum(['PKR', 'USD']),
  paymentMethod: z.enum(['JAZZCASH', 'EASYPAISA', 'PAYONEER', 'WISE', 'USDT', 'BANK_TRANSFER']),
  subscriptionType: z.enum(['MONTHLY', 'YEARLY']),
  doctorCount: z.number().int().min(1).max(100),
});

const SubscriptionUpdateSchema = z.object({
  doctorCount: z.number().int().min(1).max(100).optional(),
  subscriptionType: z.enum(['MONTHLY', 'YEARLY']).optional(),
  paymentMethod: z.enum(['JAZZCASH', 'EASYPAISA', 'PAYONEER', 'WISE', 'USDT', 'BANK_TRANSFER']).optional(),
});

const SubscriptionActivationSchema = z.object({
  subscriptionType: z.enum(['MONTHLY', 'YEARLY']),
  paymentMethod: z.enum(['JAZZCASH', 'EASYPAISA', 'PAYONEER', 'WISE', 'USDT', 'BANK_TRANSFER']),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract client IP address from request
 */
function getClientIP(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress || 
         'unknown';
}

/**
 * Extract user agent from request
 */
function getUserAgent(req: Request): string {
  return req.headers['user-agent'] || 'unknown';
}

// ============================================================================
// TRIAL MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * Check trial eligibility for phone number and email
 * POST /api/billing/trial/eligibility
 */
export const checkTrialEligibility = async (req: Request, res: Response) => {
  try {
    const validation = TrialEligibilitySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.issues,
      });
    }

    const { phoneNumber, email } = validation.data;

    const eligibility = await SubscriptionService.checkTrialEligibility(phoneNumber, email);

    return res.json({
      success: true,
      data: {
        eligible: eligibility.eligible,
        reason: eligibility.reason,
        trialLimits: TRIAL_LIMITS,
      },
    });

  } catch (error) {
    logger.error('Trial eligibility check failed', { error: (error as Error).message, body: req.body });
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to check trial eligibility',
    });
  }
};

/**
 * Register trial usage (anti-abuse tracking)
 * POST /api/billing/trial/register
 */
export const registerTrialUsage = async (req: Request, res: Response) => {
  try {
    const validation = TrialRegistrationSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.issues,
      });
    }

    const { phoneNumber, email, organizationName } = validation.data;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Organization ID required',
      });
    }

    // Check eligibility first
    const eligibility = await SubscriptionService.checkTrialEligibility(phoneNumber, email);
    if (!eligibility.eligible) {
      return res.status(400).json({
        error: 'Trial not eligible',
        message: eligibility.reason,
      });
    }

    // Register trial usage
    const trialRecord = await SubscriptionService.registerTrialUsage({
      phoneNumber,
      email,
      organizationName,
      organizationId,
      ipAddress: getClientIP(req),
      userAgent: getUserAgent(req),
    });

    // Start trial period
    const organization = await SubscriptionService.startTrialPeriod(organizationId);

    return res.status(201).json({
      success: true,
      message: 'Trial registered successfully',
      data: {
        trialId: trialRecord.id,
        trialEndDate: organization.subscriptionEndsAt,
        limits: TRIAL_LIMITS,
      },
    });

  } catch (error) {
    logger.error('Trial registration failed', { error: (error as Error).message, body: req.body });
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to register trial',
    });
  }
};

/**
 * Verify phone number for trial
 * POST /api/billing/trial/verify-phone
 */
export const verifyTrialPhone = async (req: Request, res: Response) => {
  try {
    const validation = PhoneVerificationSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.issues,
      });
    }

    const { phoneNumber, verificationCode } = validation.data;

    const isVerified = await SubscriptionService.verifyTrialPhoneNumber(phoneNumber, verificationCode);

    if (isVerified) {
      return res.json({
        success: true,
        message: 'Phone number verified successfully',
      });
    } else {
      return res.status(400).json({
        error: 'Verification failed',
        message: 'Invalid verification code',
      });
    }

  } catch (error) {
    logger.error('Phone verification failed', { error: (error as Error).message, body: req.body });
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to verify phone number',
    });
  }
};

/**
 * Check trial limits for current organization
 * GET /api/billing/trial/limits
 */
export const checkTrialLimits = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Organization ID required',
      });
    }

    const trialStatus = await SubscriptionService.checkTrialLimits(organizationId);

    return res.json({
      success: true,
      data: trialStatus,
    });

  } catch (error) {
    logger.error('Trial limits check failed', { error: (error as Error).message, organizationId: req.user?.organizationId });
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to check trial limits',
    });
  }
};

// ============================================================================
// SUBSCRIPTION MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * Calculate subscription pricing
 * POST /api/billing/subscription/calculate
 */
export const calculateSubscriptionPricing = async (req: Request, res: Response) => {
  try {
    const validation = SubscriptionCalculationSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.issues,
      });
    }

    const { doctorCount, region } = validation.data;

    const pricing = SubscriptionService.calculateSubscriptionPricing(doctorCount, region);

    return res.json({
      success: true,
      data: pricing,
    });

  } catch (error) {
    logger.error('Subscription pricing calculation failed', { error: (error as Error).message, body: req.body });
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to calculate subscription pricing',
    });
  }
};

/**
 * Get subscription usage and billing info
 * GET /api/billing/subscription/usage
 */
export const getSubscriptionUsage = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Organization ID required',
      });
    }

    const usage = await SubscriptionService.getSubscriptionUsage(organizationId);

    return res.json({
      success: true,
      data: usage,
    });

  } catch (error) {
    logger.error('Subscription usage retrieval failed', { error: (error as Error).message, organizationId: req.user?.organizationId });
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get subscription usage',
    });
  }
};

/**
 * Update subscription settings
 * PUT /api/billing/subscription
 */
export const updateSubscription = async (req: Request, res: Response) => {
  try {
    const validation = SubscriptionUpdateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.issues,
      });
    }

    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Organization ID required',
      });
    }

    const updateRequest = {
      organizationId,
      ...(validation.data.doctorCount !== undefined && { doctorCount: validation.data.doctorCount }),
      ...(validation.data.subscriptionType !== undefined && { subscriptionType: validation.data.subscriptionType }),
      ...(validation.data.paymentMethod !== undefined && { paymentMethod: validation.data.paymentMethod }),
    };

    const organization = await SubscriptionService.updateSubscription(updateRequest);

    return res.json({
      success: true,
      message: 'Subscription updated successfully',
      data: {
        subscriptionStatus: organization.subscriptionStatus,
        subscriptionType: organization.subscriptionType,
        doctorCount: organization.doctorCount,
        paymentMethod: organization.paymentMethod,
        nextBillingDate: organization.nextBillingDate,
      },
    });

  } catch (error) {
    logger.error('Subscription update failed', { error: (error as Error).message, body: req.body });
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update subscription',
    });
  }
};

/**
 * Activate paid subscription (convert from trial)
 * POST /api/billing/subscription/activate
 */
export const activateSubscription = async (req: Request, res: Response) => {
  try {
    const validation = SubscriptionActivationSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.issues,
      });
    }

    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Organization ID required',
      });
    }

    const { subscriptionType, paymentMethod } = validation.data;

    const organization = await SubscriptionService.activateSubscription(
      organizationId,
      subscriptionType,
      paymentMethod
    );

    return res.json({
      success: true,
      message: 'Subscription activated successfully',
      data: {
        subscriptionStatus: organization.subscriptionStatus,
        subscriptionEndsAt: organization.subscriptionEndsAt,
        nextBillingDate: organization.nextBillingDate,
      },
    });

  } catch (error) {
    logger.error('Subscription activation failed', { error: (error as Error).message, body: req.body });
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to activate subscription',
    });
  }
};

// ============================================================================
// PAYMENT PROCESSING ENDPOINTS
// ============================================================================

/**
 * Create payment intent
 * POST /api/billing/payments/intent
 */
export const createPaymentIntent = async (req: Request, res: Response) => {
  try {
    const validation = PaymentIntentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.issues,
      });
    }

    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Organization ID required',
      });
    }

    const { amount, currency, paymentMethod, subscriptionType, doctorCount } = validation.data;

    // Generate billing period
    const now = new Date();
    const billingPeriod = subscriptionType === 'YEARLY' 
      ? now.getFullYear().toString()
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const paymentResult = await PaymentService.createPaymentIntent({
      organizationId,
      amount,
      currency,
      paymentMethod,
      billingPeriod,
      subscriptionType,
      doctorCount,
      description: `DrSync subscription - ${billingPeriod}`,
    });

    if (paymentResult.success) {
      return res.status(201).json({
        success: true,
        message: 'Payment intent created successfully',
        data: {
          paymentIntentId: paymentResult.paymentIntentId,
          transactionId: paymentResult.transactionId,
          gatewayResponse: paymentResult.gatewayResponse,
        },
      });
    } else {
      return res.status(400).json({
        error: 'Payment failed',
        message: paymentResult.errorMessage,
        data: {
          paymentIntentId: paymentResult.paymentIntentId,
        },
      });
    }

  } catch (error) {
    logger.error('Payment intent creation failed', { error: (error as Error).message, body: req.body });
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create payment intent',
    });
  }
};

/**
 * Get supported payment methods
 * GET /api/billing/payments/methods
 */
export const getSupportedPaymentMethods = async (req: Request, res: Response) => {
  try {
    const region = req.query.region as string || 'PAKISTAN';
    const currency = req.query.currency as string || (region === 'PAKISTAN' ? 'PKR' : 'USD');

    const supportedMethods = PaymentService.getSupportedPaymentMethods(region, currency);
    const methodStatus = PaymentService.validatePaymentMethodConfiguration();

    return res.json({
      success: true,
      data: {
        supportedMethods,
        methodStatus,
        region,
        currency,
      },
    });

  } catch (error) {
    logger.error('Payment methods retrieval failed', { error: (error as Error).message, query: req.query });
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get supported payment methods',
    });
  }
};

/**
 * Get billing history
 * GET /api/billing/history
 */
export const getBillingHistory = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Organization ID required',
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const skip = (page - 1) * limit;

    const [billingHistory, totalCount] = await Promise.all([
      prisma.billingHistory.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.billingHistory.count({
        where: { organizationId },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        billingHistory,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      },
    });

  } catch (error) {
    logger.error('Billing history retrieval failed', { error: (error as Error).message, organizationId: req.user?.organizationId });
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get billing history',
    });
  }
};

// ============================================================================
// ADMIN BILLING DASHBOARD ENDPOINTS
// ============================================================================

/**
 * Get billing overview statistics (SUPER_ADMIN only)
 * GET /api/billing/admin/overview
 */
export const getBillingOverview = async (req: Request, res: Response) => {
  try {
    // Check admin permissions
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Super admin access required',
      });
    }

    const [
      totalOrganizations,
      activeSubscriptions,
      trialOrganizations,
      overdueOrganizations,
      monthlyRevenue,
      yearlyRevenue,
      recentPayments,
    ] = await Promise.all([
      prisma.organization.count(),
      prisma.organization.count({ where: { subscriptionStatus: 'ACTIVE' } }),
      prisma.organization.count({ where: { subscriptionStatus: 'TRIAL' } }),
      prisma.organization.count({ where: { subscriptionStatus: 'PAST_DUE' } }),
      
      // Monthly revenue (current month)
      prisma.billingHistory.aggregate({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
          paymentStatus: 'SUCCESS',
        },
        _sum: { amount: true },
      }),
      
      // Yearly revenue (current year)
      prisma.billingHistory.aggregate({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), 0, 1),
          },
          paymentStatus: 'SUCCESS',
        },
        _sum: { amount: true },
      }),
      
      // Recent payments (last 10)
      prisma.billingHistory.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          organization: {
            select: { name: true, region: true },
          },
        },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        overview: {
          totalOrganizations,
          activeSubscriptions,
          trialOrganizations,
          overdueOrganizations,
          conversionRate: totalOrganizations > 0 ? (activeSubscriptions / totalOrganizations) * 100 : 0,
        },
        revenue: {
          monthly: Number(monthlyRevenue._sum.amount || 0),
          yearly: Number(yearlyRevenue._sum.amount || 0),
        },
        recentPayments: recentPayments.map(payment => ({
          id: payment.id,
          amount: Number(payment.amount),
          currency: payment.currency,
          paymentMethod: payment.paymentMethod,
          paymentStatus: payment.paymentStatus,
          organizationName: payment.organization.name,
          region: payment.organization.region,
          createdAt: payment.createdAt,
        })),
      },
    });

  } catch (error) {
    logger.error('Billing overview retrieval failed', { error: (error as Error).message, userId: req.user?.id });
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get billing overview',
    });
  }
};

/**
 * Get trial abuse monitoring data (SUPER_ADMIN only)
 * GET /api/billing/admin/trial-monitoring
 */
export const getTrialMonitoring = async (req: Request, res: Response) => {
  try {
    // Check admin permissions
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Super admin access required',
      });
    }

    const [
      totalTrials,
      verifiedTrials,
      suspiciousActivity,
      recentTrials,
    ] = await Promise.all([
      prisma.trialHistory.count(),
      prisma.trialHistory.count({ where: { phoneVerified: true } }),
      
      // Suspicious activity (multiple trials from same email)
      prisma.trialHistory.groupBy({
        by: ['email'],
        having: {
          id: {
            _count: {
              gt: 1,
            },
          },
        },
        _count: {
          id: true,
        },
      }),
      
      // Recent trial registrations
      prisma.trialHistory.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        statistics: {
          totalTrials,
          verifiedTrials,
          verificationRate: totalTrials > 0 ? (verifiedTrials / totalTrials) * 100 : 0,
          suspiciousActivityCount: suspiciousActivity.length,
        },
        suspiciousActivity: suspiciousActivity.map(activity => ({
          email: activity.email,
          trialCount: activity._count.id,
        })),
        recentTrials: recentTrials.map(trial => ({
          id: trial.id,
          phoneNumber: trial.phoneNumber,
          email: trial.email,
          organizationName: trial.organizationName,
          phoneVerified: trial.phoneVerified,
          ipAddress: trial.ipAddress,
          createdAt: trial.createdAt,
        })),
      },
    });

  } catch (error) {
    logger.error('Trial monitoring data retrieval failed', { error: (error as Error).message, userId: req.user?.id });
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get trial monitoring data',
    });
  }
};

/**
 * Process automatic billing cycle (SUPER_ADMIN only)
 * POST /api/billing/admin/process-billing
 */
export const processAutomaticBilling = async (req: Request, res: Response) => {
  try {
    // Check admin permissions
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Super admin access required',
      });
    }

    const result = await SubscriptionService.processAutomaticBilling();

    return res.json({
      success: true,
      message: 'Automatic billing cycle completed',
      data: result,
    });

  } catch (error) {
    logger.error('Automatic billing process failed', { error: (error as Error).message, userId: req.user?.id });
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process automatic billing',
    });
  }
};

export default {
  // Trial management
  checkTrialEligibility,
  registerTrialUsage,
  verifyTrialPhone,
  checkTrialLimits,
  
  // Subscription management
  calculateSubscriptionPricing,
  getSubscriptionUsage,
  updateSubscription,
  activateSubscription,
  
  // Payment processing
  createPaymentIntent,
  getSupportedPaymentMethods,
  getBillingHistory,
  
  // Admin dashboard
  getBillingOverview,
  getTrialMonitoring,
  processAutomaticBilling,
};