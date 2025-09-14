/**
 * Billing Routes for DrSync Billing System
 * 
 * Route Endpoints:
 * - /api/billing/trial/* - Trial management and abuse prevention
 * - /api/billing/subscription/* - Subscription management
 * - /api/billing/payments/* - Payment processing
 * - /api/billing/admin/* - Admin billing dashboard
 * 
 * @author DrSync Development Team
 * @version 1.0.0
 */

import express from 'express';
import billingController from '../controllers/billingController';
import { authenticate } from '../middleware/auth';
import { authorize } from '../utils/roleUtils';

const router = express.Router();

// ============================================================================
// TRIAL MANAGEMENT ROUTES
// ============================================================================

/**
 * Check trial eligibility for phone number and email
 * POST /api/billing/trial/eligibility
 */
router.post('/trial/eligibility', billingController.checkTrialEligibility);

/**
 * Register trial usage (anti-abuse tracking)
 * POST /api/billing/trial/register
 * Requires: Authentication
 */
router.post('/trial/register', authenticate, billingController.registerTrialUsage);

/**
 * Verify phone number for trial
 * POST /api/billing/trial/verify-phone
 */
router.post('/trial/verify-phone', billingController.verifyTrialPhone);

/**
 * Check trial limits for current organization
 * GET /api/billing/trial/limits
 * Requires: Authentication
 */
router.get('/trial/limits', authenticate, billingController.checkTrialLimits);

// ============================================================================
// SUBSCRIPTION MANAGEMENT ROUTES
// ============================================================================

/**
 * Calculate subscription pricing
 * POST /api/billing/subscription/calculate
 */
router.post('/subscription/calculate', billingController.calculateSubscriptionPricing);

/**
 * Get subscription usage and billing info
 * GET /api/billing/subscription/usage
 * Requires: Authentication, STAFF+ role
 */
router.get('/subscription/usage', 
  authenticate, 
  authorize(['STAFF', 'RECEPTIONIST', 'NURSE', 'DOCTOR', 'ORG_ADMIN', 'SUPER_ADMIN']), 
  billingController.getSubscriptionUsage
);

/**
 * Update subscription settings
 * PUT /api/billing/subscription
 * Requires: Authentication, ORG_ADMIN+ role
 */
router.put('/subscription', 
  authenticate, 
  authorize(['ORG_ADMIN', 'SUPER_ADMIN']), 
  billingController.updateSubscription
);

/**
 * Activate paid subscription (convert from trial)
 * POST /api/billing/subscription/activate
 * Requires: Authentication, ORG_ADMIN+ role
 */
router.post('/subscription/activate', 
  authenticate, 
  authorize(['ORG_ADMIN', 'SUPER_ADMIN']), 
  billingController.activateSubscription
);

// ============================================================================
// PAYMENT PROCESSING ROUTES
// ============================================================================

/**
 * Create payment intent
 * POST /api/billing/payments/intent
 * Requires: Authentication, ORG_ADMIN+ role
 */
router.post('/payments/intent', 
  authenticate, 
  authorize(['ORG_ADMIN', 'SUPER_ADMIN']), 
  billingController.createPaymentIntent
);

/**
 * Get supported payment methods
 * GET /api/billing/payments/methods
 */
router.get('/payments/methods', billingController.getSupportedPaymentMethods);

/**
 * Get billing history
 * GET /api/billing/history
 * Requires: Authentication, STAFF+ role
 */
router.get('/history', 
  authenticate, 
  authorize(['STAFF', 'RECEPTIONIST', 'NURSE', 'DOCTOR', 'ORG_ADMIN', 'SUPER_ADMIN']), 
  billingController.getBillingHistory
);

// ============================================================================
// ADMIN BILLING DASHBOARD ROUTES
// ============================================================================

/**
 * Get billing overview statistics
 * GET /api/billing/admin/overview
 * Requires: Authentication, SUPER_ADMIN role
 */
router.get('/admin/overview', 
  authenticate, 
  authorize(['SUPER_ADMIN']), 
  billingController.getBillingOverview
);

/**
 * Get trial abuse monitoring data
 * GET /api/billing/admin/trial-monitoring
 * Requires: Authentication, SUPER_ADMIN role
 */
router.get('/admin/trial-monitoring', 
  authenticate, 
  authorize(['SUPER_ADMIN']), 
  billingController.getTrialMonitoring
);

/**
 * Process automatic billing cycle
 * POST /api/billing/admin/process-billing
 * Requires: Authentication, SUPER_ADMIN role
 */
router.post('/admin/process-billing', 
  authenticate, 
  authorize(['SUPER_ADMIN']), 
  billingController.processAutomaticBilling
);

export default router;