import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireSuperAdmin } from '../middleware/requireSuperAdmin';
import { superAdminController } from '../controllers/superAdminController';

/**
 * Super Admin Routes
 * Platform-wide administration endpoints
 * 
 * Security: All routes require SUPER_ADMIN role
 * Prefix: /api/super-admin
 * 
 * Middleware stack:
 * 1. authenticate - Verify JWT token
 * 2. requireSuperAdmin - Verify SUPER_ADMIN role
 */

const router = Router();

// Apply authentication and super admin authorization to all routes
router.use(authenticate);
router.use(requireSuperAdmin);

// ============================================================================
// TASK-038A: ORGANIZATION MANAGEMENT
// ============================================================================

/**
 * SUBTASK-038A-001: Organization Listing & Search
 * GET /api/super-admin/organizations
 * 
 * Query parameters:
 * - search: string (multi-field search)
 * - subscriptionStatus: string (comma-separated: TRIAL,ACTIVE,etc)
 * - organizationType: string (comma-separated: CLINIC,HOSPITAL,etc)
 * - subscriptionPlan: string (comma-separated: FREE,BASIC,etc)
 * - region: string (PAKISTAN, INTERNATIONAL)
 * - isActive: boolean
 * - createdFrom: date (ISO 8601)
 * - createdTo: date (ISO 8601)
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 * - sortBy: string (name, createdAt, subscriptionStatus)
 * - sortOrder: string (asc, desc)
 */
router.get(
  '/organizations',
  superAdminController.listOrganizations.bind(superAdminController)
);

/**
 * SUBTASK-038A-002: Organization Details View
 * GET /api/super-admin/organizations/:id
 * 
 * Returns comprehensive organization details including:
 * - Full profile and settings
 * - User count, patient count, appointment count, message count
 * - User list with roles
 * - Integration status (WhatsApp, Google Sheets)
 * - Subscription and billing information
 * 
 * Security: Credentials are masked
 */
router.get(
  '/organizations/:id',
  superAdminController.getOrganizationDetails.bind(superAdminController)
);

/**
 * SUBTASK-038A-006: Organization Statistics Dashboard
 * GET /api/super-admin/statistics/organizations
 * 
 * Returns platform-wide organization statistics:
 * - Total, active, trial, suspended, inactive counts
 * - New registrations (today, week, month)
 * - Distribution by type, plan, region, status
 */
router.get(
  '/statistics/organizations',
  superAdminController.getOrganizationStatistics.bind(superAdminController)
);

/**
 * SUBTASK-038A-003: Update Organization Status
 * PATCH /api/super-admin/organizations/:id/status
 * 
 * Body: { isActive: boolean, reason?: string }
 * 
 * Activate or deactivate an organization
 * Deactivation prevents all login and API access
 */
router.patch(
  '/organizations/:id/status',
  superAdminController.updateOrganizationStatus.bind(superAdminController)
);

/**
 * SUBTASK-038A-003: Suspend Organization
 * POST /api/super-admin/organizations/:id/suspend
 * 
 * Body: { reason: string }
 * 
 * Suspend an organization (sets status to SUSPENDED and isActive to false)
 * Requires suspension reason for audit trail
 */
router.post(
  '/organizations/:id/suspend',
  superAdminController.suspendOrganization.bind(superAdminController)
);

/**
 * SUBTASK-038A-004: Get Organization Configuration
 * GET /api/super-admin/organizations/:id/config
 * 
 * Returns organization configuration settings:
 * - Timezone, language, region
 * - Trial limits (maxPatients, maxAppointments)
 * - Subscription details
 * - Integration status
 * - Setup progress
 */
router.get(
  '/organizations/:id/config',
  superAdminController.getOrganizationConfig.bind(superAdminController)
);

/**
 * SUBTASK-038A-004: Update Trial Limits
 * PATCH /api/super-admin/organizations/:id/limits
 * 
 * Body: { maxPatients: number, maxAppointments: number }
 * 
 * Update trial limits for special cases
 */
router.patch(
  '/organizations/:id/limits',
  superAdminController.updateTrialLimits.bind(superAdminController)
);

/**
 * SUBTASK-038A-005: Get Organization Users
 * GET /api/super-admin/organizations/:id/users
 * 
 * Returns all users for an organization
 * Includes user details, roles, and last login information
 */
router.get(
  '/organizations/:id/users',
  superAdminController.getOrganizationUsers.bind(superAdminController)
);

// ============================================================================
// TASK-038B: BILLING & SUBSCRIPTION MANAGEMENT
// ============================================================================

/**
 * SUBTASK-038B-001: Billing Dashboard Overview
 * GET /api/super-admin/billing/overview
 * 
 * Returns comprehensive billing metrics:
 * - MRR (Monthly Recurring Revenue)
 * - ARR (Annual Recurring Revenue)
 * - Total revenue, outstanding payments, failed payments
 * - Revenue growth metrics
 * - Revenue breakdown by plan, payment method, and region
 */
router.get(
  '/billing/overview',
  superAdminController.getBillingOverview.bind(superAdminController)
);

/**
 * SUBTASK-038B-002: Payment Transaction Monitoring
 * GET /api/super-admin/billing/transactions
 * 
 * Query parameters:
 * - status: string (comma-separated: SUCCESS,FAILED,PENDING,CANCELLED)
 * - paymentMethod: string (comma-separated: BANK_TRANSFER,JAZZCASH,etc)
 * - organizationId: string
 * - dateFrom: date (ISO 8601)
 * - dateTo: date (ISO 8601)
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 */
router.get(
  '/billing/transactions',
  superAdminController.listTransactions.bind(superAdminController)
);

/**
 * SUBTASK-038B-002: Payment Status Breakdown
 * GET /api/super-admin/billing/payment-status
 * 
 * Returns count and amount breakdown by payment status
 */
router.get(
  '/billing/payment-status',
  superAdminController.getPaymentStatusBreakdown.bind(superAdminController)
);

/**
 * SUBTASK-038B-002: Retry Failed Payment
 * POST /api/super-admin/billing/transactions/:id/retry
 * 
 * Retry a failed payment transaction
 * Only works for payments with FAILED status and within retry limits
 */
router.post(
  '/billing/transactions/:id/retry',
  superAdminController.retryPayment.bind(superAdminController)
);

/**
 * SUBTASK-038B-002: Process Refund
 * POST /api/super-admin/billing/transactions/:id/refund
 * 
 * Body: { amount: number, reason: string }
 * 
 * Process a refund for a successful payment
 * Only works for payments with SUCCESS status
 */
router.post(
  '/billing/transactions/:id/refund',
  superAdminController.processRefund.bind(superAdminController)
);

/**
 * SUBTASK-038B-003: Subscription Lifecycle Overview
 * GET /api/super-admin/subscriptions/lifecycle
 * 
 * Returns subscription lifecycle metrics:
 * - Active, trial, suspended, cancelled counts
 * - Churn rate, retention metrics
 * - Distribution by plan and status
 */
router.get(
  '/subscriptions/lifecycle',
  superAdminController.getSubscriptionLifecycle.bind(superAdminController)
);

/**
 * SUBTASK-038B-003: Update Organization Subscription
 * PUT /api/super-admin/subscriptions/:id
 * 
 * Body: { subscriptionPlan: string, reason?: string }
 * 
 * Update organization subscription plan
 * Valid plans: FREE, BASIC, PROFESSIONAL, ENTERPRISE
 */
router.put(
  '/subscriptions/:id',
  superAdminController.updateSubscription.bind(superAdminController)
);

/**
 * SUBTASK-038B-003: Suspend Organization Subscription
 * POST /api/super-admin/subscriptions/:id/suspend
 * 
 * Body: { reason: string }
 * 
 * Suspend organization subscription and access
 */
router.post(
  '/subscriptions/:id/suspend',
  superAdminController.suspendSubscription.bind(superAdminController)
);

/**
 * SUBTASK-038B-003: Reactivate Organization Subscription
 * POST /api/super-admin/subscriptions/:id/reactivate
 * 
 * Reactivate a suspended organization subscription
 */
router.post(
  '/subscriptions/:id/reactivate',
  superAdminController.reactivateSubscription.bind(superAdminController)
);

/**
 * SUBTASK-038B-004: Trial Management Overview
 * GET /api/super-admin/trials/overview
 * 
 * Returns trial management metrics:
 * - Active trials, conversion rate
 * - Trials expiring today/soon
 * - Recently expired trials
 * - Total trials started and converted
 */
router.get(
  '/trials/overview',
  superAdminController.getTrialOverview.bind(superAdminController)
);

/**
 * SUBTASK-038B-004: Trial Abuse Detection
 * GET /api/super-admin/trials/abuse-detection
 * 
 * Detects suspicious trial abuse patterns:
 * - Duplicate phone numbers
 * - Duplicate emails
 * - Multiple trial registrations
 * - Risk scoring for organizations
 */
router.get(
  '/trials/abuse-detection',
  superAdminController.detectTrialAbuse.bind(superAdminController)
);

/**
 * SUBTASK-038B-004: Monitor Trial Usage Limits
 * GET /api/super-admin/trials/usage
 * 
 * Returns usage statistics for all trial organizations:
 * - Current patients/appointments vs limits
 * - Usage percentages
 * - Organizations near or over limits
 */
router.get(
  '/trials/usage',
  superAdminController.monitorTrialUsage.bind(superAdminController)
);

/**
 * SUBTASK-038B-004: Extend Trial Period
 * POST /api/super-admin/trials/:id/extend
 * 
 * Body: { extensionDays: number, reason: string }
 * 
 * Extend trial period for an organization
 */
router.post(
  '/trials/:id/extend',
  superAdminController.extendTrial.bind(superAdminController)
);

/**
 * SUBTASK-038B-004: Trial Conversion Tracking
 * GET /api/super-admin/trials/conversions
 * 
 * Query parameters:
 * - days: number (default: 30)
 * 
 * Returns trial conversion metrics for specified period:
 * - Trials started, converted, still active, cancelled
 * - Conversion rate, cancel rate
 */
router.get(
  '/trials/conversions',
  superAdminController.getTrialConversions.bind(superAdminController)
);

/**
 * SUBTASK-038B-004: Trial End Actions
 * GET /api/super-admin/trials/ending-actions
 * 
 * Returns actionable trial end information:
 * - Trials expiring today
 * - Recently expired trials
 * - Recommended actions for follow-up
 */
router.get(
  '/trials/ending-actions',
  superAdminController.getTrialsEndingActions.bind(superAdminController)
);

// ============================================================================
// TASK-038C: PLATFORM ANALYTICS & HEALTH MONITORING
// ============================================================================

/**
 * SUBTASK-038C-001: System Health Overview
 * GET /api/super-admin/analytics/system-health
 * 
 * Returns comprehensive system health metrics:
 * - Overall system status (healthy, degraded, down)
 * - Uptime percentage
 * - Active organizations and users
 * - API performance (response time, error rate, RPM)
 * - Database health (connections, query times)
 * - External services health (WhatsApp, Sheets, Email)
 */
router.get(
  '/analytics/system-health',
  superAdminController.getSystemHealth.bind(superAdminController)
);

/**
 * SUBTASK-038C-002: Usage Analytics
 * GET /api/super-admin/analytics/usage
 * 
 * Returns platform usage analytics:
 * - Daily/Monthly active organizations
 * - DAU/MAU ratio
 * - Total appointments and booking methods
 * - Feature adoption rates (WhatsApp, Sheets, Staff)
 * - Communication metrics
 * - User engagement metrics
 */
router.get(
  '/analytics/usage',
  superAdminController.getUsageAnalytics.bind(superAdminController)
);

/**
 * SUBTASK-038C-003: Growth & Conversion Analytics
 * GET /api/super-admin/analytics/growth
 * 
 * Returns growth and conversion metrics:
 * - Registration funnel (signups → active users)
 * - Trial to paid conversion rates
 * - Organization and user growth (today, week, month)
 * - Month-over-month growth percentages
 * - Revenue growth (MRR, MRR growth)
 * - Cohort retention rates
 */
router.get(
  '/analytics/growth',
  superAdminController.getGrowthAnalytics.bind(superAdminController)
);

/**
 * SUBTASK-038C-004: Performance Benchmarks
 * GET /api/super-admin/analytics/benchmarks
 * 
 * Returns performance benchmarks across organizations:
 * - Appointments/Patients/Messages per org (percentiles)
 * - High performers (top 10%)
 * - Low performers (organizations with issues)
 * - Recommendations for improvement
 */
router.get(
  '/analytics/benchmarks',
  superAdminController.getPerformanceBenchmarks.bind(superAdminController)
);

// ============================================================================
// TASK-038B-005: INVOICE & RECEIPT MANAGEMENT (Phase 2)
// ============================================================================

/**
 * List All Invoices
 * GET /api/super-admin/billing/invoices
 * 
 * Query parameters:
 * - organizationId?: string
 * - status?: string (comma-separated: pending, paid, failed, cancelled)
 * - dateFrom?: string (ISO date)
 * - dateTo?: string (ISO date)
 * - page?: number
 * - limit?: number
 * 
 * Returns paginated list of invoices with filters
 */
router.get(
  '/billing/invoices',
  superAdminController.listInvoices.bind(superAdminController)
);

/**
 * Generate Invoice Preview
 * POST /api/super-admin/billing/invoices/preview
 * 
 * Body: { billingHistoryId: string }
 * 
 * Generates invoice preview without saving to database
 */
router.post(
  '/billing/invoices/preview',
  superAdminController.generateInvoicePreview.bind(superAdminController)
);

/**
 * Generate & Send Invoice
 * POST /api/super-admin/billing/invoices/generate
 * 
 * Body: { billingHistoryId: string, sendEmail?: boolean }
 * 
 * Generates invoice and optionally sends via email
 */
router.post(
  '/billing/invoices/generate',
  superAdminController.generateAndSendInvoice.bind(superAdminController)
);

/**
 * Generate Invoice (by ID)
 * POST /api/super-admin/billing/invoices/:id/generate
 * 
 * Generates invoice for a billing history record
 */
router.post(
  '/billing/invoices/:id/generate',
  superAdminController.generateInvoice.bind(superAdminController)
);

/**
 * List All Receipts
 * GET /api/super-admin/billing/receipts
 * 
 * Query parameters:
 * - organizationId?: string
 * - dateFrom?: string (ISO date)
 * - dateTo?: string (ISO date)
 * - page?: number
 * - limit?: number
 * 
 * Returns paginated list of payment receipts
 */
router.get(
  '/billing/receipts',
  superAdminController.listReceipts.bind(superAdminController)
);

/**
 * Generate Receipt
 * POST /api/super-admin/billing/receipts/:id/generate
 * 
 * Generates receipt for a payment intent
 */
router.post(
  '/billing/receipts/:id/generate',
  superAdminController.generateReceipt.bind(superAdminController)
);

// ============================================================================
// TASK-038B-006: REVENUE REPORTS & ANALYTICS (Phase 2)
// ============================================================================

/**
 * Revenue Trend Analysis
 * GET /api/super-admin/revenue/trends
 * 
 * Query parameters:
 * - granularity: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
 * - startDate: string (ISO date)
 * - endDate: string (ISO date)
 * 
 * Returns revenue trends over time with MRR, ARR, growth rates
 */
router.get(
  '/revenue/trends',
  superAdminController.getRevenueTrends.bind(superAdminController)
);

/**
 * Customer Lifetime Value (LTV) Analysis
 * GET /api/super-admin/revenue/ltv
 * 
 * Query parameters:
 * - segmentBy?: 'plan' | 'region' | 'organizationType'
 * 
 * Returns LTV metrics:
 * - Average LTV per customer
 * - LTV by subscription tier (if segmented)
 * - Total LTV across all customers
 */
router.get(
  '/revenue/ltv',
  superAdminController.calculateLTV.bind(superAdminController)
);

/**
 * Churn Analysis
 * GET /api/super-admin/revenue/churn
 * 
 * Query parameters:
 * - startDate: string (ISO date)
 * - endDate: string (ISO date)
 * 
 * Returns churn analysis:
 * - Churn rate
 * - Churned revenue (monthly and annual)
 * - Number of churned organizations
 */
router.get(
  '/revenue/churn',
  superAdminController.analyzeChurn.bind(superAdminController)
);

/**
 * Revenue Forecasting
 * GET /api/super-admin/revenue/forecast
 * 
 * Query parameters:
 * - months?: number (forecast period, default 12)
 * 
 * Returns revenue forecast based on historical data:
 * - Projected MRR/ARR
 * - Growth projections
 * - Confidence intervals (best/worst case)
 * - Key assumptions
 */
router.get(
  '/revenue/forecast',
  superAdminController.generateRevenueForecast.bind(superAdminController)
);

// ============================================================================
// TASK-038D: SUPPORT & TICKETING SYSTEM
// ============================================================================

/**
 * List Support Tickets
 * GET /api/super-admin/support/tickets
 * 
 * Query parameters:
 * - status: string (comma-separated: OPEN,IN_PROGRESS,RESOLVED,CLOSED)
 * - priority: string (comma-separated: LOW,MEDIUM,HIGH,URGENT)
 * - category: string (comma-separated: TECHNICAL,BILLING,etc)
 * - organizationId: string
 * - assignedTo: string
 * - page: number (default: 1)
 * - limit: number (default: 20)
 * - sortBy: string (default: createdAt)
 * - sortOrder: string (asc, desc)
 */
router.get(
  '/support/tickets',
  superAdminController.listTickets.bind(superAdminController)
);

/**
 * Get Ticket Details
 * GET /api/super-admin/support/tickets/:id
 */
router.get(
  '/support/tickets/:id',
  superAdminController.getTicketDetails.bind(superAdminController)
);

/**
 * Create Support Ticket
 * POST /api/super-admin/support/tickets
 * 
 * Body:
 * - organizationId: string
 * - subject: string
 * - description: string
 * - category: string
 * - priority?: string
 * - tags?: string[]
 * - attachments?: any
 */
router.post(
  '/support/tickets',
  superAdminController.createTicket.bind(superAdminController)
);

/**
 * Update Ticket Status
 * PATCH /api/super-admin/support/tickets/:id/status
 * 
 * Body:
 * - status: string (OPEN, IN_PROGRESS, RESOLVED, CLOSED)
 * - notes?: string
 */
router.patch(
  '/support/tickets/:id/status',
  superAdminController.updateTicketStatus.bind(superAdminController)
);

/**
 * Assign Ticket
 * PATCH /api/super-admin/support/tickets/:id/assign
 * 
 * Body:
 * - assignedTo: string (user ID)
 */
router.patch(
  '/support/tickets/:id/assign',
  superAdminController.assignTicket.bind(superAdminController)
);

/**
 * Add Ticket Response
 * POST /api/super-admin/support/tickets/:id/responses
 * 
 * Body:
 * - message: string
 * - isInternal?: boolean
 * - attachments?: any
 */
router.post(
  '/support/tickets/:id/responses',
  superAdminController.addTicketResponse.bind(superAdminController)
);

/**
 * Get Support Metrics
 * GET /api/super-admin/support/metrics
 * 
 * Returns:
 * - Total tickets, open, in progress, resolved, closed
 * - Average resolution time
 * - Tickets by priority and category
 */
router.get(
  '/support/metrics',
  superAdminController.getSupportMetrics.bind(superAdminController)
);

/**
 * Get Ticket Volume Trends
 * GET /api/super-admin/support/ticket-trends
 * 
 * Query parameters:
 * - days?: number (default: 30)
 */
router.get(
  '/support/ticket-trends',
  superAdminController.getTicketTrends.bind(superAdminController)
);

/**
 * Get Agent Performance
 * GET /api/super-admin/support/agent-performance
 * 
 * Query parameters:
 * - agentId?: string (filter by specific agent)
 */
router.get(
  '/support/agent-performance',
  superAdminController.getAgentPerformance.bind(superAdminController)
);

// ============================================================================
// TASK-038D: EMAIL TEMPLATES & COMMUNICATION
// ============================================================================

/**
 * List Email Templates
 * GET /api/super-admin/communication/templates
 * 
 * Query parameters:
 * - category?: string
 * - isActive?: boolean
 * - page?: number
 * - limit?: number
 */
router.get(
  '/communication/templates',
  superAdminController.listEmailTemplates.bind(superAdminController)
);

/**
 * Create Email Template
 * POST /api/super-admin/communication/templates
 * 
 * Body:
 * - name: string
 * - subject: string
 * - htmlContent: string
 * - textContent?: string
 * - category: string
 * - variables?: string[]
 */
router.post(
  '/communication/templates',
  superAdminController.createEmailTemplate.bind(superAdminController)
);

/**
 * Update Email Template
 * PATCH /api/super-admin/communication/templates/:id
 */
router.patch(
  '/communication/templates/:id',
  superAdminController.updateEmailTemplate.bind(superAdminController)
);

/**
 * Send Notification
 * POST /api/super-admin/communication/notify
 * 
 * Body:
 * - organizationId: string
 * - templateId?: string
 * - category?: string
 * - subject?: string
 * - htmlContent?: string
 * - variables?: Record<string, string>
 * - to?: string
 * - cc?: string[]
 * - priority?: string
 */
router.post(
  '/communication/notify',
  superAdminController.sendNotification.bind(superAdminController)
);

/**
 * Get Communication History
 * GET /api/super-admin/communication/history/:organizationId
 * 
 * Query parameters:
 * - type?: string (EMAIL, SMS, etc)
 * - direction?: string (INBOUND, OUTBOUND)
 * - status?: string (SENT, FAILED, PENDING)
 * - page?: number
 * - limit?: number
 */
router.get(
  '/communication/history/:organizationId',
  superAdminController.getCommunicationHistory.bind(superAdminController)
);

/**
 * Get Communication Statistics
 * GET /api/super-admin/communication/stats
 * 
 * Query parameters:
 * - organizationId?: string
 * - days?: number (default: 30)
 */
router.get(
  '/communication/stats',
  superAdminController.getCommunicationStats.bind(superAdminController)
);

// ============================================================================
// TASK-038D: KNOWLEDGE BASE
// ============================================================================

/**
 * List Knowledge Base Articles
 * GET /api/super-admin/knowledge-base/articles
 * 
 * Query parameters:
 * - category?: string
 * - subcategory?: string
 * - tags?: string (comma-separated)
 * - isPublished?: boolean
 * - search?: string
 * - page?: number
 * - limit?: number
 * - sortBy?: string
 * - sortOrder?: string (asc, desc)
 */
router.get(
  '/knowledge-base/articles',
  superAdminController.listKnowledgeBaseArticles.bind(superAdminController)
);

/**
 * Get Knowledge Base Article
 * GET /api/super-admin/knowledge-base/articles/:id
 * 
 * Query parameters:
 * - incrementView?: boolean (default: false)
 */
router.get(
  '/knowledge-base/articles/:id',
  superAdminController.getKnowledgeBaseArticle.bind(superAdminController)
);

/**
 * Create Knowledge Base Article
 * POST /api/super-admin/knowledge-base/articles
 * 
 * Body:
 * - title: string
 * - content: string
 * - category: string
 * - subcategory?: string
 * - tags?: string[]
 * - isPublished?: boolean
 * - metadata?: any
 */
router.post(
  '/knowledge-base/articles',
  superAdminController.createKnowledgeBaseArticle.bind(superAdminController)
);

/**
 * Update Knowledge Base Article
 * PATCH /api/super-admin/knowledge-base/articles/:id
 */
router.patch(
  '/knowledge-base/articles/:id',
  superAdminController.updateKnowledgeBaseArticle.bind(superAdminController)
);

/**
 * Delete Knowledge Base Article
 * DELETE /api/super-admin/knowledge-base/articles/:id
 */
router.delete(
  '/knowledge-base/articles/:id',
  superAdminController.deleteKnowledgeBaseArticle.bind(superAdminController)
);

/**
 * Search Knowledge Base
 * GET /api/super-admin/knowledge-base/search
 * 
 * Query parameters:
 * - q: string (search query, required)
 * - category?: string
 * - tags?: string (comma-separated)
 * - limit?: number (default: 10)
 */
router.get(
  '/knowledge-base/search',
  superAdminController.searchKnowledgeBase.bind(superAdminController)
);

/**
 * Get Knowledge Base Statistics
 * GET /api/super-admin/knowledge-base/stats
 */
router.get(
  '/knowledge-base/stats',
  superAdminController.getKnowledgeBaseStats.bind(superAdminController)
);

/**
 * Get Popular Articles
 * GET /api/super-admin/knowledge-base/popular
 * 
 * Query parameters:
 * - category?: string
 * - limit?: number (default: 10)
 */
router.get(
  '/knowledge-base/popular',
  superAdminController.getPopularArticles.bind(superAdminController)
);

export default router;
