/**
 * Support Analytics Routes - SUBTASK-038D-005
 * 
 * API endpoints for support analytics and reporting
 */

import express from 'express';
import { supportAnalyticsController } from '../controllers/supportAnalyticsController';

const router = express.Router();

// ============================================================================
// SUPPORT METRICS (038D-005-1)
// ============================================================================

/**
 * Get support metrics dashboard
 */
router.get(
  '/metrics',
  supportAnalyticsController.getSupportMetrics.bind(supportAnalyticsController)
);

// ============================================================================
// TICKET VOLUME TRENDS (038D-005-2)
// ============================================================================

/**
 * Get ticket volume trends
 */
router.get(
  '/trends',
  supportAnalyticsController.getTicketVolumeTrends.bind(supportAnalyticsController)
);

// ============================================================================
// CATEGORY ANALYSIS (038D-005-3)
// ============================================================================

/**
 * Get category analysis
 */
router.get(
  '/analytics/categories',
  supportAnalyticsController.getCategoryAnalysis.bind(supportAnalyticsController)
);

// ============================================================================
// TEAM PERFORMANCE (038D-005-4)
// ============================================================================

/**
 * Get team performance metrics
 */
router.get(
  '/analytics/team',
  supportAnalyticsController.getTeamPerformance.bind(supportAnalyticsController)
);

// ============================================================================
// SLA COMPLIANCE (038D-005-5)
// ============================================================================

/**
 * Get SLA compliance reports
 */
router.get(
  '/sla-compliance',
  supportAnalyticsController.getSLACompliance.bind(supportAnalyticsController)
);

// ============================================================================
// SUMMARY REPORTS (038D-005-6)
// ============================================================================

/**
 * Generate summary report
 */
router.get(
  '/reports/summary',
  supportAnalyticsController.generateSummaryReport.bind(supportAnalyticsController)
);

export default router;
