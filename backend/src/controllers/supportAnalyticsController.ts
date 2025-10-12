/**
 * Support Analytics Controller - SUBTASK-038D-005
 * 
 * HTTP endpoints for support analytics and reporting
 */

import { Request, Response } from 'express';
import { supportAnalyticsService } from '../services/supportAnalyticsService';
import { logger } from '../utils/logger';

export class SupportAnalyticsController {

  /**
   * 038D-005-1: Get support metrics dashboard
   * GET /api/super-admin/support/metrics
   */
  async getSupportMetrics(req: Request, res: Response) {
    try {
      const { period = '30d' } = req.query;

      const metrics = await supportAnalyticsService.getSupportMetrics(period as string);

      return res.status(200).json({
        success: true,
        data: metrics
      });
    } catch (error: any) {
      logger.error('Error getting support metrics:', error);
      return res.status(500).json({
        error: 'Failed to get support metrics',
        details: error.message
      });
    }
  }

  /**
   * 038D-005-2: Get ticket volume trends
   * GET /api/super-admin/support/trends
   */
  async getTicketVolumeTrends(req: Request, res: Response) {
    try {
      const { period = '90d', granularity = 'daily' } = req.query;

      if (granularity && !['daily', 'weekly', 'monthly'].includes(granularity as string)) {
        return res.status(400).json({
          error: 'Invalid granularity. Must be daily, weekly, or monthly'
        });
      }

      const trends = await supportAnalyticsService.getTicketVolumeTrends(
        period as string,
        granularity as 'daily' | 'weekly' | 'monthly'
      );

      return res.status(200).json({
        success: true,
        data: trends
      });
    } catch (error: any) {
      logger.error('Error getting ticket volume trends:', error);
      return res.status(500).json({
        error: 'Failed to get ticket volume trends',
        details: error.message
      });
    }
  }

  /**
   * 038D-005-3: Get category analysis
   * GET /api/super-admin/support/analytics/categories
   */
  async getCategoryAnalysis(req: Request, res: Response) {
    try {
      const { period = '30d' } = req.query;

      const analysis = await supportAnalyticsService.getCategoryAnalysis(period as string);

      return res.status(200).json({
        success: true,
        data: analysis
      });
    } catch (error: any) {
      logger.error('Error getting category analysis:', error);
      return res.status(500).json({
        error: 'Failed to get category analysis',
        details: error.message
      });
    }
  }

  /**
   * 038D-005-4: Get team performance metrics
   * GET /api/super-admin/support/analytics/team
   */
  async getTeamPerformance(req: Request, res: Response) {
    try {
      const { period = '30d' } = req.query;

      const performance = await supportAnalyticsService.getTeamPerformance(period as string);

      return res.status(200).json({
        success: true,
        data: performance
      });
    } catch (error: any) {
      logger.error('Error getting team performance:', error);
      return res.status(500).json({
        error: 'Failed to get team performance metrics',
        details: error.message
      });
    }
  }

  /**
   * 038D-005-5: Get SLA compliance reports
   * GET /api/super-admin/support/sla-compliance
   */
  async getSLACompliance(req: Request, res: Response) {
    try {
      const { period = '30d' } = req.query;

      const compliance = await supportAnalyticsService.getSLACompliance(period as string);

      return res.status(200).json({
        success: true,
        data: compliance
      });
    } catch (error: any) {
      logger.error('Error getting SLA compliance:', error);
      return res.status(500).json({
        error: 'Failed to get SLA compliance reports',
        details: error.message
      });
    }
  }

  /**
   * 038D-005-6: Generate summary report
   * GET /api/super-admin/support/reports/summary
   */
  async generateSummaryReport(req: Request, res: Response) {
    try {
      const { reportType = 'weekly', date } = req.query;

      if (!['daily', 'weekly', 'monthly'].includes(reportType as string)) {
        return res.status(400).json({
          error: 'Invalid reportType. Must be daily, weekly, or monthly'
        });
      }

      const targetDate = date ? new Date(date as string) : undefined;

      const report = await supportAnalyticsService.generateSummaryReport(
        reportType as 'daily' | 'weekly' | 'monthly',
        targetDate
      );

      return res.status(200).json({
        success: true,
        data: report
      });
    } catch (error: any) {
      logger.error('Error generating summary report:', error);
      return res.status(500).json({
        error: 'Failed to generate summary report',
        details: error.message
      });
    }
  }
}

export const supportAnalyticsController = new SupportAnalyticsController();
