import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import OrganizationRegistrationService, { OrganizationRegistrationRequest } from '../services/organizationRegistrationService';
import { logger } from '../utils/logger';

const router = Router();
const registrationService = new OrganizationRegistrationService();

// Rate limiting for registration endpoints
const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // limit each IP to 3 registration attempts per windowMs
  message: {
    success: false,
    error: 'Too many registration attempts',
    message: 'Please try again later',
    code: 'REGISTRATION_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Phone verification rate limiter
const phoneVerificationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // limit each IP to 5 phone verification requests per 5 minutes
  message: {
    success: false,
    error: 'Too many verification requests',
    message: 'Please wait before requesting another verification code',
    code: 'PHONE_VERIFICATION_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/organizations/register
 * Register a new organization with admin user and start trial
 */
router.post('/register', registrationLimiter, asyncHandler(async (req: Request, res: Response) => {
  try {
    // Extract client IP and user agent for trial abuse prevention
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    const registrationData: OrganizationRegistrationRequest = {
      ...req.body,
      ipAddress,
      userAgent,
    };

    logger.info('Organization registration attempt', {
      organizationName: registrationData.organizationName,
      adminEmail: registrationData.adminUser?.email,
      ipAddress,
      userAgent,
    });

    // Validate required fields
    if (!registrationData.organizationName?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Organization name is required',
        code: 'VALIDATION_ERROR'
      });
    }

    if (!registrationData.adminUser?.firstName?.trim() || 
        !registrationData.adminUser?.lastName?.trim() ||
        !registrationData.adminUser?.email?.trim() ||
        !registrationData.adminUser?.password ||
        !registrationData.adminUser?.phone?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'All admin user fields are required (firstName, lastName, email, password, phone)',
        code: 'VALIDATION_ERROR'
      });
    }

    if (!registrationData.acceptedTerms) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Terms and conditions must be accepted',
        code: 'VALIDATION_ERROR'
      });
    }

    // Process registration
    const result = await registrationService.registerOrganization(registrationData);

    if (!result.success) {
      // Handle phone verification requirement
      if (result.requiresPhoneVerification) {
        return res.status(202).json({
          success: false,
          requiresPhoneVerification: true,
          message: result.error || 'Phone verification required',
          code: 'PHONE_VERIFICATION_REQUIRED'
        });
      }

      // Handle other errors
      const statusCode = result.error?.includes('already registered') || 
                        result.error?.includes('already been used') ? 409 : 400;
      
      return res.status(statusCode).json({
        success: false,
        error: 'Registration failed',
        message: result.error,
        code: 'REGISTRATION_ERROR'
      });
    }

    // Success response
    logger.info('Organization registration successful', {
      organizationId: result.organization?.id,
      adminUserId: result.adminUser?.id,
    });

    return res.status(201).json({
      success: true,
      message: 'Organization registered successfully',
      data: {
        organization: {
          id: result.organization!.id,
          name: result.organization!.name,
          slug: result.organization!.slug,
          subscriptionStatus: result.organization!.subscriptionStatus,
          subscriptionPlan: result.organization!.subscriptionPlan,
        },
        adminUser: {
          id: result.adminUser!.id,
          firstName: result.adminUser!.firstName,
          lastName: result.adminUser!.lastName,
          email: result.adminUser!.email,
          role: result.adminUser!.role,
          organization: result.adminUser!.organization,
        },
        tokens: result.tokens,
        trial: result.trialDetails,
      },
    });

  } catch (error) {
    logger.error('Organization registration error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Registration process failed',
      code: 'REGISTRATION_SERVER_ERROR'
    });
  }
}));

/**
 * POST /api/organizations/verify-phone
 * Verify phone number for trial registration
 */
router.post('/verify-phone', phoneVerificationLimiter, asyncHandler(async (req: Request, res: Response) => {
  try {
    const { phoneNumber, verificationCode } = req.body;

    if (!phoneNumber || !verificationCode) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Phone number and verification code are required',
        code: 'VALIDATION_ERROR'
      });
    }

    // In production, this would verify with SMS/WhatsApp service
    // For now, using mock verification from subscription service
    const { SubscriptionService } = await import('../services/subscriptionService');
    const isValid = await SubscriptionService.verifyTrialPhoneNumber(phoneNumber, verificationCode);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Verification failed',
        message: 'Invalid verification code',
        code: 'PHONE_VERIFICATION_INVALID'
      });
    }

    return res.json({
      success: true,
      message: 'Phone number verified successfully',
      data: { phoneVerified: true }
    });

  } catch (error) {
    logger.error('Phone verification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Phone verification failed',
      code: 'PHONE_VERIFICATION_ERROR'
    });
  }
}));

/**
 * POST /api/organizations/resend-verification
 * Resend phone verification code
 */
router.post('/resend-verification', phoneVerificationLimiter, asyncHandler(async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Phone number is required',
        code: 'VALIDATION_ERROR'
      });
    }

    const result = await registrationService.resendPhoneVerification(phoneNumber);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Resend verification failed',
        message: result.error,
        code: 'PHONE_VERIFICATION_RESEND_ERROR'
      });
    }

    return res.json({
      success: true,
      message: 'Verification code sent successfully',
    });

  } catch (error) {
    logger.error('Resend phone verification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to resend verification code',
      code: 'PHONE_VERIFICATION_RESEND_SERVER_ERROR'
    });
  }
}));

/**
 * GET /api/organizations/check-availability
 * Check if organization name or email is available
 */
router.get('/check-availability', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { organizationName, email } = req.query;

    if (!organizationName && !email) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Either organization name or email must be provided',
        code: 'VALIDATION_ERROR'
      });
    }

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const availability: {
      organizationNameAvailable?: boolean;
      emailAvailable?: boolean;
    } = {};

    if (organizationName) {
      const existingOrg = await prisma.organization.findFirst({
        where: { 
          name: {
            equals: organizationName as string,
            mode: 'insensitive',
          }
        },
      });
      availability.organizationNameAvailable = !existingOrg;
    }

    if (email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: (email as string).toLowerCase().trim() },
      });
      availability.emailAvailable = !existingUser;
    }

    return res.json({
      success: true,
      data: availability,
    });

  } catch (error) {
    logger.error('Availability check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Availability check failed',
      code: 'AVAILABILITY_CHECK_ERROR'
    });
  }
}));

/**
 * GET /api/organizations/:id/registration-status
 * Get organization registration and trial status (authenticated)
 */
router.get('/:id/registration-status', authenticate, asyncHandler(async (req: Request, res: Response) => {
  try {
    const organizationId = req.params.id;
    const user = (req as any).user;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Bad request',
        message: 'Organization ID is required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Check if user belongs to this organization or is super admin
    if (user.organizationId !== organizationId && user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have permission to view this organization',
        code: 'ACCESS_DENIED'
      });
    }

    const result = await registrationService.getRegistrationStatus(organizationId);

    if (result.error) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: result.error,
        code: 'ORGANIZATION_NOT_FOUND'
      });
    }

    return res.json({
      success: true,
      data: {
        organization: {
          id: result.organization!.id,
          name: result.organization!.name,
          slug: result.organization!.slug,
          subscriptionStatus: result.organization!.subscriptionStatus,
          subscriptionPlan: result.organization!.subscriptionPlan,
          subscriptionEndsAt: result.organization!.subscriptionEndsAt,
          isActive: result.organization!.isActive,
          doctorCount: result.organization!.doctorCount,
        },
        trialInfo: result.trialInfo,
        admins: (result.organization as any).users || [],
      },
    });

  } catch (error) {
    logger.error('Registration status check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get registration status',
      code: 'REGISTRATION_STATUS_ERROR'
    });
  }
}));

export default router;