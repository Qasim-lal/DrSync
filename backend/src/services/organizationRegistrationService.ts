/**
 * Organization Registration Service
 * 
 * Handles the complete organization signup flow including:
 * - Organization creation with trial activation
 * - Admin user account creation and role assignment  
 * - Phone number verification for trial abuse prevention
 * - Email notifications for welcome and setup instructions
 * - Integration with subscription service for trial management
 * 
 * @author DrSync Development Team
 * @version 1.0.0
 */

import { PrismaClient, Organization, OrganizationType } from '@prisma/client';
import { logger } from '../utils/logger';
import { AuthService, AuthUser } from './auth';
import { SubscriptionService, TRIAL_LIMITS } from './subscriptionService';
import { EmailService } from './emailService';
import { generateSlug } from '../utils/helpers';

const prisma = new PrismaClient();

export interface OrganizationRegistrationRequest {
  // Organization details
  organizationName: string;
  organizationType?: OrganizationType;
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  
  // Admin user details
  adminUser: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone: string;
  };
  
  // Registration metadata
  phoneVerificationCode?: string;
  ipAddress?: string;
  userAgent?: string;
  acceptedTerms: boolean;
  marketingConsent?: boolean;
}

export interface OrganizationRegistrationResult {
  success: boolean;
  organization?: Organization;
  adminUser?: AuthUser;
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
  trialDetails?: {
    trialEndDate: Date;
    maxPatients: number;
    maxAppointments: number;
    daysRemaining: number;
  };
  error?: string;
  requiresPhoneVerification?: boolean;
}

export class OrganizationRegistrationService {
  private authService: AuthService;
  private emailService: EmailService;

  constructor() {
    this.authService = new AuthService();
    this.emailService = new EmailService();
  }

  /**
   * Register a new organization with admin user and trial activation
   */
  async registerOrganization(request: OrganizationRegistrationRequest): Promise<OrganizationRegistrationResult> {
    try {
      logger.info('Starting organization registration', { 
        organizationName: request.organizationName,
        adminEmail: request.adminUser.email 
      });

      // 1. Validate registration request
      const validationResult = await this.validateRegistrationRequest(request);
      if (!validationResult.valid) {
      return {
        success: false,
        error: validationResult.error || 'Validation failed',
      };
      }

      // 2. Check trial eligibility (phone abuse prevention)
      const eligibilityCheck = await SubscriptionService.checkTrialEligibility(
        request.adminUser.phone,
        request.adminUser.email
      );

      if (!eligibilityCheck.eligible) {
        return {
          success: false,
          error: eligibilityCheck.reason || 'Not eligible for trial',
        };
      }

      // 3. Verify phone number if verification code provided
      let phoneVerified = false;
      if (request.phoneVerificationCode) {
        phoneVerified = await SubscriptionService.verifyTrialPhoneNumber(
          request.adminUser.phone,
          request.phoneVerificationCode
        );
        
        if (!phoneVerified) {
          return {
            success: false,
            error: 'Invalid phone verification code',
          };
        }
      } else {
        // Return early to request phone verification
        return {
          success: false,
          requiresPhoneVerification: true,
          error: 'Phone verification required to prevent trial abuse',
        };
      }

      // 4. Create organization in database transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create organization
        const organization = await tx.organization.create({
          data: {
            name: request.organizationName,
            slug: await this.generateUniqueSlug(request.organizationName),
            organizationType: request.organizationType || 'CLINIC',
            email: request.adminUser.email, // Use admin email as organization contact
            phone: request.adminUser.phone,
            subscriptionStatus: 'TRIAL',
            subscriptionPlan: 'BASIC',
            isActive: true,
            // Combine address fields into single address string
            address: request.address ? 
              `${request.address.street}, ${request.address.city}, ${request.address.state} ${request.address.postalCode}, ${request.address.country || 'Pakistan'}`.trim() : 
              null,
            // Trial and subscription defaults
            doctorCount: 1, // Initially 1 doctor (the admin)
            maxPatients: TRIAL_LIMITS.maxPatients,
            maxAppointments: TRIAL_LIMITS.maxAppointments,
          },
        });

        // Create admin user within the transaction
        const hashedPassword = await this.authService.hashPassword(request.adminUser.password);
        const adminUser = await tx.user.create({
          data: {
            email: request.adminUser.email.toLowerCase().trim(),
            password: hashedPassword,
            firstName: request.adminUser.firstName,
            lastName: request.adminUser.lastName,
            organizationId: organization.id,
            role: 'ORG_ADMIN',
            phone: request.adminUser.phone || null,
            isActive: true,
          },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        });

        return { organization, adminUser };
      });

      // 5. Start trial period
      const organizationWithTrial = await SubscriptionService.startTrialPeriod(result.organization.id);

      // 6. Register trial usage for abuse prevention
      const trialUsageData: any = {
        phoneNumber: request.adminUser.phone,
        email: request.adminUser.email,
        organizationName: request.organizationName,
        organizationId: result.organization.id,
      };
      
      if (request.ipAddress) {
        trialUsageData.ipAddress = request.ipAddress;
      }
      
      if (request.userAgent) {
        trialUsageData.userAgent = request.userAgent;
      }
      
      await SubscriptionService.registerTrialUsage(trialUsageData);

      // 7. Generate authentication tokens for immediate login
      const tokens = this.authService.generateTokenPair(result.adminUser);

      // 8. Send welcome email with setup instructions
      await this.sendWelcomeEmail(result.organization, result.adminUser, organizationWithTrial);

      // 9. Calculate trial details for response
      const trialEndDate = organizationWithTrial.subscriptionEndsAt!;
      const daysRemaining = Math.ceil((trialEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

      logger.info('Organization registration completed successfully', {
        organizationId: result.organization.id,
        adminUserId: result.adminUser.id,
        trialEndDate: trialEndDate.toISOString(),
      });

      return {
        success: true,
        organization: organizationWithTrial,
        adminUser: result.adminUser,
        tokens,
        trialDetails: {
          trialEndDate,
          maxPatients: TRIAL_LIMITS.maxPatients,
          maxAppointments: TRIAL_LIMITS.maxAppointments,
          daysRemaining,
        },
      };

    } catch (error) {
      logger.error('Organization registration failed', { 
        error: (error as Error).message,
        organizationName: request.organizationName,
        adminEmail: request.adminUser.email,
      });

      return {
        success: false,
        error: 'Registration failed. Please try again or contact support.',
      };
    }
  }

  /**
   * Validate registration request data
   */
  private async validateRegistrationRequest(request: OrganizationRegistrationRequest): Promise<{
    valid: boolean;
    error?: string;
  }> {
    // Check required fields
    if (!request.organizationName?.trim()) {
      return { valid: false, error: 'Organization name is required' };
    }

    if (!request.adminUser?.firstName?.trim()) {
      return { valid: false, error: 'Admin first name is required' };
    }

    if (!request.adminUser?.lastName?.trim()) {
      return { valid: false, error: 'Admin last name is required' };
    }

    if (!request.adminUser?.email?.trim()) {
      return { valid: false, error: 'Admin email is required' };
    }

    if (!request.adminUser?.password) {
      return { valid: false, error: 'Admin password is required' };
    }

    if (!request.adminUser?.phone?.trim()) {
      return { valid: false, error: 'Admin phone number is required' };
    }

    if (!request.acceptedTerms) {
      return { valid: false, error: 'Terms and conditions must be accepted' };
    }

    // Validate email format and length
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(request.adminUser.email)) {
      return { valid: false, error: 'Invalid email format' };
    }

    // Validate email length (RFC 5322 limit is 320 characters)
    if (request.adminUser.email.length > 254) {
      return { valid: false, error: 'Email address too long (maximum 254 characters)' };
    }

    // Validate password strength
    if (request.adminUser.password.length < 8) {
      return { valid: false, error: 'Password must be at least 8 characters long' };
    }

    // Validate phone format (basic)
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(request.adminUser.phone)) {
      return { valid: false, error: 'Invalid phone number format' };
    }

    // Check if email is already in use
    const existingUser = await prisma.user.findUnique({
      where: { email: request.adminUser.email.toLowerCase().trim() },
    });

    if (existingUser) {
      return { valid: false, error: 'Email address is already registered' };
    }

    // Check if organization name is already in use
    const existingOrg = await prisma.organization.findFirst({
      where: { 
        name: {
          equals: request.organizationName.trim(),
          mode: 'insensitive',
        }
      },
    });

    if (existingOrg) {
      return { valid: false, error: 'Organization name is already registered' };
    }

    return { valid: true };
  }

  /**
   * Generate unique slug for organization
   */
  private async generateUniqueSlug(organizationName: string): Promise<string> {
    const baseSlug = generateSlug(organizationName);
    let slug = baseSlug;
    let counter = 1;

    // Check if slug exists and append counter if needed
    while (await prisma.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  /**
   * Send welcome email to new organization admin
   */
  private async sendWelcomeEmail(
    organization: Organization,
    adminUser: AuthUser,
    organizationWithTrial: Organization
  ): Promise<void> {
    try {
      const trialEndDate = organizationWithTrial.subscriptionEndsAt!;
      const daysRemaining = Math.ceil((trialEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

      // Use existing email service structure
      const emailData = {
        to: adminUser.email,
        subject: `Welcome to DrSync - Your ${daysRemaining}-Day Trial Has Started!`,
        welcomeData: {
          organizationName: organization.name,
          adminName: `${adminUser.firstName} ${adminUser.lastName}`,
          trialEndDate,
          daysRemaining,
          maxPatients: TRIAL_LIMITS.maxPatients,
          maxAppointments: TRIAL_LIMITS.maxAppointments,
          loginUrl: `${process.env.FRONTEND_URL}/login`,
          setupGuideUrl: `${process.env.FRONTEND_URL}/setup-guide`,
        },
        timestamp: new Date(),
      };

      // Send welcome email (will extend email service to handle this)
      await this.emailService.sendWelcomeEmail(emailData);

      logger.info('Welcome email sent successfully', {
        organizationId: organization.id,
        adminEmail: adminUser.email,
      });

    } catch (error) {
      logger.error('Failed to send welcome email', {
        error: (error as Error).message,
        organizationId: organization.id,
        adminEmail: adminUser.email,
      });
      // Don't throw error - registration should still succeed even if email fails
    }
  }

  /**
   * Resend phone verification code
   */
  async resendPhoneVerification(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Mock implementation - in production, integrate with SMS/WhatsApp API
      logger.info('Phone verification code resent', { phoneNumber });
      
      // In production, send actual SMS/WhatsApp message
      // For now, always return success (code is "123456" in mock implementation)
      
      return { success: true };

    } catch (error) {
      logger.error('Failed to resend phone verification', {
        error: (error as Error).message,
        phoneNumber,
      });

      return {
        success: false,
        error: 'Failed to resend verification code. Please try again.',
      };
    }
  }

  /**
   * Get organization registration status/progress
   */
  async getRegistrationStatus(organizationId: string): Promise<{
    organization?: Organization;
    trialInfo?: any;
    error?: string;
  }> {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          users: {
            where: { role: 'ORG_ADMIN' },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              isActive: true,
            },
          },
        },
      });

      if (!organization) {
        return { error: 'Organization not found' };
      }

      // Get trial limits info
      const trialInfo = await SubscriptionService.checkTrialLimits(organizationId);

      return {
        organization,
        trialInfo,
      };

    } catch (error) {
      logger.error('Failed to get registration status', {
        error: (error as Error).message,
        organizationId,
      });

      return { error: 'Failed to get registration status' };
    }
  }
}

export default OrganizationRegistrationService;