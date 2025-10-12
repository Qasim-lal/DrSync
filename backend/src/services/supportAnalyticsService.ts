/**
 * Support Analytics Service - SUBTASK-038D-005
 * 
 * Provides analytics and reporting for support operations
 * Tracks metrics, trends, performance, and SLA compliance
 */

import { getPrismaClient } from './prisma';
import { logger } from '../utils/logger';

const prisma = getPrismaClient();

/**
 * SUBTASK-038D-005: Support Analytics & Reporting
 */
export class SupportAnalyticsService {
  
  /**
   * 038D-005-1: Get support metrics dashboard
   */
  async getSupportMetrics(period: string = '30d') {
    try {
      const days = this.parsePeriodToDays(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get ticket counts
      const [openTickets, closedTickets, totalTickets] = await Promise.all([
        prisma.supportTicket.count({
          where: {
            status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER'] }
          }
        }),
        prisma.supportTicket.count({
          where: {
            status: { in: ['RESOLVED', 'CLOSED'] },
            updatedAt: { gte: startDate }
          }
        }),
        prisma.supportTicket.count({
          where: {
            createdAt: { gte: startDate }
          }
        })
      ]);

      // Get tickets with resolution times
      const resolvedTickets = await prisma.supportTicket.findMany({
        where: {
          status: { in: ['RESOLVED', 'CLOSED'] },
          resolvedAt: { gte: startDate, not: null }
        },
        select: {
          createdAt: true,
          resolvedAt: true,
          responses: {
            orderBy: { createdAt: 'asc' },
            take: 1,
            select: { createdAt: true }
          }
        }
      });

      // Calculate average resolution time (in hours)
      let totalResolutionTime = 0;
      let totalFirstResponseTime = 0;
      let ticketsWithResponse = 0;

      for (const ticket of resolvedTickets) {
        if (ticket.resolvedAt) {
          const resolutionTime = ticket.resolvedAt.getTime() - ticket.createdAt.getTime();
          totalResolutionTime += resolutionTime;

          // Calculate first response time
          if (ticket.responses.length > 0 && ticket.responses[0]) {
            const firstResponseTime = ticket.responses[0].createdAt.getTime() - ticket.createdAt.getTime();
            totalFirstResponseTime += firstResponseTime;
            ticketsWithResponse++;
          }
        }
      }

      const avgResolutionTime = resolvedTickets.length > 0
        ? totalResolutionTime / resolvedTickets.length / (1000 * 60 * 60) // Convert to hours
        : 0;

      const avgFirstResponseTime = ticketsWithResponse > 0
        ? totalFirstResponseTime / ticketsWithResponse / (1000 * 60) // Convert to minutes
        : 0;

      // Get tickets per agent (assigned to)
      const ticketsByAgent = await prisma.supportTicket.groupBy({
        by: ['assignedTo'],
        where: {
          assignedTo: { not: null },
          status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER'] }
        },
        _count: true
      });

      const ticketsPerAgent: Record<string, number> = {};
      for (const item of ticketsByAgent) {
        if (item.assignedTo) {
          ticketsPerAgent[item.assignedTo] = item._count;
        }
      }

      // Calculate CSAT score (Customer Satisfaction)
      // In real implementation, this would come from feedback/ratings
      // For now, simulate based on resolution speed
      const csatScore = avgResolutionTime < 24 ? 4.5 : avgResolutionTime < 48 ? 4.0 : 3.5;

      logger.info(`Support metrics calculated for period: ${period}`);

      return {
        period,
        openTickets,
        closedTickets,
        totalTickets,
        avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
        avgFirstResponseTime: Math.round(avgFirstResponseTime * 10) / 10,
        csatScore: Math.round(csatScore * 10) / 10,
        ticketsPerAgent,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error getting support metrics:', error);
      throw new Error('Failed to get support metrics');
    }
  }

  /**
   * 038D-005-2: Get ticket volume trends
   */
  async getTicketVolumeTrends(period: string = '90d', granularity: 'daily' | 'weekly' | 'monthly' = 'daily') {
    try {
      const days = this.parsePeriodToDays(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get all tickets in period
      const tickets = await prisma.supportTicket.findMany({
        where: {
          createdAt: { gte: startDate }
        },
        select: {
          createdAt: true,
          status: true
        },
        orderBy: { createdAt: 'asc' }
      });

      // Group by time period
      const volumeByPeriod = this.groupTicketsByPeriod(tickets, granularity);

      // Calculate trend
      const volumes = Object.values(volumeByPeriod);
      const trend = this.calculateTrend(volumes);

      // Simple forecasting (next 7 periods)
      const forecast = this.forecastVolume(volumes, 7);

      // Capacity recommendation
      const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
      const peakVolume = Math.max(...volumes);
      const capacityRecommendation = this.getCapacityRecommendation(avgVolume, peakVolume, trend);

      logger.info(`Ticket volume trends calculated for ${period} with ${granularity} granularity`);

      return {
        period,
        granularity,
        volumeByPeriod,
        trend,
        forecast,
        avgVolume: Math.round(avgVolume * 10) / 10,
        peakVolume,
        capacityRecommendation,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error getting ticket volume trends:', error);
      throw new Error('Failed to get ticket volume trends');
    }
  }

  /**
   * 038D-005-3: Get category analysis
   */
  async getCategoryAnalysis(period: string = '30d') {
    try {
      const days = this.parsePeriodToDays(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get ticket distribution by category
      const categoryDistribution = await prisma.supportTicket.groupBy({
        by: ['category'],
        where: {
          createdAt: { gte: startDate }
        },
        _count: true,
        orderBy: {
          _count: { category: 'desc' }
        }
      });

      const distribution: Record<string, number> = {};
      let total = 0;
      for (const item of categoryDistribution) {
        distribution[item.category] = item._count;
        total += item._count;
      }

      // Calculate percentages
      const distributionWithPercentage = Object.entries(distribution).map(([category, count]) => ({
        category,
        count,
        percentage: Math.round((count / total) * 100 * 10) / 10
      }));

      // Identify common issues (top categories)
      const commonIssues = distributionWithPercentage.slice(0, 3).map(item => ({
        category: item.category,
        count: item.count,
        description: this.getCategoryDescription(item.category)
      }));

      // Generate preventive measures
      const preventiveMeasures = this.generatePreventiveMeasures(commonIssues);

      // Category trends (compare with previous period)
      const previousStartDate = new Date(startDate);
      previousStartDate.setDate(previousStartDate.getDate() - days);

      const previousDistribution = await prisma.supportTicket.groupBy({
        by: ['category'],
        where: {
          createdAt: { gte: previousStartDate, lt: startDate }
        },
        _count: true
      });

      const trends: Record<string, 'increasing' | 'decreasing' | 'stable'> = {};
      for (const current of categoryDistribution) {
        const previous = previousDistribution.find(p => p.category === current.category);
        if (previous) {
          const change = ((current._count - previous._count) / previous._count) * 100;
          if (change > 10) trends[current.category] = 'increasing';
          else if (change < -10) trends[current.category] = 'decreasing';
          else trends[current.category] = 'stable';
        } else {
          trends[current.category] = 'increasing';
        }
      }

      logger.info(`Category analysis calculated for period: ${period}`);

      return {
        period,
        distribution: distributionWithPercentage,
        commonIssues,
        preventiveMeasures,
        trends,
        totalTickets: total,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error getting category analysis:', error);
      throw new Error('Failed to get category analysis');
    }
  }

  /**
   * 038D-005-4: Get team performance metrics
   */
  async getTeamPerformance(period: string = '30d') {
    try {
      const days = this.parsePeriodToDays(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get all assigned tickets
      const assignedTickets = await prisma.supportTicket.findMany({
        where: {
          assignedTo: { not: null },
          createdAt: { gte: startDate }
        },
        include: {
          responses: {
            orderBy: { createdAt: 'asc' },
            take: 1
          }
        }
      });

      // Group by agent
      const agentMetrics: Record<string, {
        totalTickets: number;
        resolvedTickets: number;
        activeTickets: number;
        totalFirstResponseTime: number;
        totalResolutionTime: number;
        ticketsWithResponse: number;
        ticketsResolved: number;
      }> = {};

      for (const ticket of assignedTickets) {
        const agent = ticket.assignedTo!;
        
        if (!agentMetrics[agent]) {
          agentMetrics[agent] = {
            totalTickets: 0,
            resolvedTickets: 0,
            activeTickets: 0,
            totalFirstResponseTime: 0,
            totalResolutionTime: 0,
            ticketsWithResponse: 0,
            ticketsResolved: 0
          };
        }

        agentMetrics[agent].totalTickets++;

        if (['RESOLVED', 'CLOSED'].includes(ticket.status)) {
          agentMetrics[agent].resolvedTickets++;
          
          if (ticket.resolvedAt) {
            const resolutionTime = ticket.resolvedAt.getTime() - ticket.createdAt.getTime();
            agentMetrics[agent].totalResolutionTime += resolutionTime;
            agentMetrics[agent].ticketsResolved++;
          }
        } else {
          agentMetrics[agent].activeTickets++;
        }

        if (ticket.responses.length > 0 && ticket.responses[0]) {
          const firstResponseTime = ticket.responses[0].createdAt.getTime() - ticket.createdAt.getTime();
          agentMetrics[agent].totalFirstResponseTime += firstResponseTime;
          agentMetrics[agent].ticketsWithResponse++;
        }
      }

      // Calculate averages per agent
      const performanceByAgent = Object.entries(agentMetrics).map(([agentId, metrics]) => ({
        agentId,
        totalTickets: metrics.totalTickets,
        resolvedTickets: metrics.resolvedTickets,
        activeTickets: metrics.activeTickets,
        avgFirstResponseTime: metrics.ticketsWithResponse > 0
          ? Math.round((metrics.totalFirstResponseTime / metrics.ticketsWithResponse) / (1000 * 60) * 10) / 10
          : 0,
        avgResolutionTime: metrics.ticketsResolved > 0
          ? Math.round((metrics.totalResolutionTime / metrics.ticketsResolved) / (1000 * 60 * 60) * 10) / 10
          : 0,
        resolutionRate: metrics.totalTickets > 0
          ? Math.round((metrics.resolvedTickets / metrics.totalTickets) * 100 * 10) / 10
          : 0,
        // Simulated CSAT score based on performance
        csatScore: this.calculateAgentCSAT(
          metrics.totalFirstResponseTime / metrics.ticketsWithResponse / (1000 * 60),
          metrics.totalResolutionTime / metrics.ticketsResolved / (1000 * 60 * 60)
        )
      }));

      // Sort by resolution rate
      performanceByAgent.sort((a, b) => b.resolutionRate - a.resolutionRate);

      logger.info(`Team performance metrics calculated for period: ${period}`);

      return {
        period,
        performanceByAgent,
        totalAgents: performanceByAgent.length,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error getting team performance:', error);
      throw new Error('Failed to get team performance metrics');
    }
  }

  /**
   * 038D-005-5: Get SLA compliance reports
   */
  async getSLACompliance(period: string = '30d') {
    try {
      const days = this.parsePeriodToDays(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Define SLA targets
      const slaTargets = {
        firstResponse: {
          LOW: 24 * 60, // 24 hours in minutes
          MEDIUM: 8 * 60, // 8 hours
          HIGH: 4 * 60, // 4 hours
          URGENT: 1 * 60 // 1 hour
        },
        resolution: {
          LOW: 7 * 24 * 60, // 7 days in minutes
          MEDIUM: 3 * 24 * 60, // 3 days
          HIGH: 1 * 24 * 60, // 1 day
          URGENT: 4 * 60 // 4 hours
        }
      };

      // Get tickets with responses
      const tickets = await prisma.supportTicket.findMany({
        where: {
          createdAt: { gte: startDate }
        },
        include: {
          responses: {
            orderBy: { createdAt: 'asc' },
            take: 1
          }
        }
      });

      let totalTickets = tickets.length;
      let firstResponseCompliance = 0;
      let resolutionCompliance = 0;
      let firstResponseBreaches: Array<{ticketId: string, priority: string, actual: number, target: number}> = [];
      let resolutionBreaches: Array<{ticketId: string, priority: string, actual: number, target: number}> = [];

      for (const ticket of tickets) {
        const priority = ticket.priority as keyof typeof slaTargets.firstResponse;
        
        // Check first response SLA
        if (ticket.responses.length > 0 && ticket.responses[0]) {
          const firstResponseTime = (ticket.responses[0].createdAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60);
          const firstResponseTarget = slaTargets.firstResponse[priority];
          
          if (firstResponseTime <= firstResponseTarget) {
            firstResponseCompliance++;
          } else {
            firstResponseBreaches.push({
              ticketId: ticket.ticketNumber,
              priority: ticket.priority,
              actual: Math.round(firstResponseTime),
              target: firstResponseTarget
            });
          }
        }

        // Check resolution SLA
        if (ticket.resolvedAt) {
          const resolutionTime = (ticket.resolvedAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60);
          const resolutionTarget = slaTargets.resolution[priority];
          
          if (resolutionTime <= resolutionTarget) {
            resolutionCompliance++;
          } else {
            resolutionBreaches.push({
              ticketId: ticket.ticketNumber,
              priority: ticket.priority,
              actual: Math.round(resolutionTime / 60), // Convert to hours
              target: Math.round(resolutionTarget / 60)
            });
          }
        }
      }

      const firstResponseComplianceRate = totalTickets > 0
        ? Math.round((firstResponseCompliance / totalTickets) * 100 * 10) / 10
        : 0;

      const resolutionComplianceRate = totalTickets > 0
        ? Math.round((resolutionCompliance / totalTickets) * 100 * 10) / 10
        : 0;

      // Generate improvement areas
      const improvementAreas = this.identifyImprovementAreas(
        firstResponseComplianceRate,
        resolutionComplianceRate,
        firstResponseBreaches,
        resolutionBreaches
      );

      logger.info(`SLA compliance calculated for period: ${period}`);

      return {
        period,
        slaTargets,
        compliance: {
          firstResponse: {
            rate: firstResponseComplianceRate,
            compliant: firstResponseCompliance,
            total: totalTickets,
            breaches: firstResponseBreaches.slice(0, 10) // Top 10 breaches
          },
          resolution: {
            rate: resolutionComplianceRate,
            compliant: resolutionCompliance,
            total: totalTickets,
            breaches: resolutionBreaches.slice(0, 10)
          }
        },
        improvementAreas,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error getting SLA compliance:', error);
      throw new Error('Failed to get SLA compliance');
    }
  }

  /**
   * 038D-005-6: Generate summary reports
   */
  async generateSummaryReport(reportType: 'daily' | 'weekly' | 'monthly', date?: Date) {
    try {
      const targetDate = date || new Date();
      let startDate: Date;
      let endDate: Date;
      let period: string;

      // Determine date range based on report type
      switch (reportType) {
        case 'daily':
          startDate = new Date(targetDate);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(targetDate);
          endDate.setHours(23, 59, 59, 999);
          period = '1d';
          break;
        case 'weekly':
          startDate = new Date(targetDate);
          startDate.setDate(startDate.getDate() - 7);
          endDate = new Date(targetDate);
          period = '7d';
          break;
        case 'monthly':
          startDate = new Date(targetDate);
          startDate.setDate(startDate.getDate() - 30);
          endDate = new Date(targetDate);
          period = '30d';
          break;
      }

      // Get all key metrics
      const [metrics, categoryAnalysis, teamPerformance, slaCompliance] = await Promise.all([
        this.getSupportMetrics(period),
        this.getCategoryAnalysis(period),
        this.getTeamPerformance(period),
        this.getSLACompliance(period)
      ]);

      // Generate executive summary
      const executiveSummary = this.generateExecutiveSummary(metrics, categoryAnalysis, slaCompliance);

      // Generate insights
      const insights = this.generateInsights(metrics, categoryAnalysis, teamPerformance, slaCompliance);

      const report = {
        reportType,
        period: { startDate, endDate },
        generatedAt: new Date(),
        executiveSummary,
        metrics,
        categoryAnalysis,
        teamPerformance,
        slaCompliance,
        insights,
        // Export metadata
        exportFormats: ['PDF', 'CSV', 'JSON'],
        canEmail: true
      };

      logger.info(`Summary report generated: ${reportType} for ${targetDate.toISOString()}`);

      return report;
    } catch (error) {
      logger.error('Error generating summary report:', error);
      throw new Error('Failed to generate summary report');
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private parsePeriodToDays(period: string): number {
    const match = period.match(/^(\d+)([dwm])$/);
    if (!match) return 30; // Default to 30 days

    const [, num, unit] = match;
    const value = parseInt(num as string);

    switch (unit) {
      case 'd': return value;
      case 'w': return value * 7;
      case 'm': return value * 30;
      default: return 30;
    }
  }

  private groupTicketsByPeriod(
    tickets: Array<{createdAt: Date}>,
    granularity: 'daily' | 'weekly' | 'monthly'
  ): Record<string, number> {
    const grouped: Record<string, number> = {};

    for (const ticket of tickets) {
      let key: string;
      const date = new Date(ticket.createdAt);

      switch (granularity) {
        case 'daily':
          key = date.toISOString().split('T')[0] as string;
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0] as string;
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString().split('T')[0] as string;
      }

      grouped[key] = (grouped[key] || 0) + 1;
    }

    return grouped;
  }

  private calculateTrend(volumes: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (volumes.length < 2) return 'stable';

    const firstHalf = volumes.slice(0, Math.floor(volumes.length / 2));
    const secondHalf = volumes.slice(Math.floor(volumes.length / 2));

    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const change = ((avgSecond - avgFirst) / avgFirst) * 100;

    if (change > 15) return 'increasing';
    if (change < -15) return 'decreasing';
    return 'stable';
  }

  private forecastVolume(volumes: number[], periods: number): Array<{period: number, predictedCount: number}> {
    if (volumes.length === 0) return [];

    // Simple moving average forecast
    const windowSize = Math.min(7, volumes.length);
    const recentAvg = volumes.slice(-windowSize).reduce((a, b) => a + b, 0) / windowSize;

    const forecast: Array<{period: number, predictedCount: number}> = [];
    for (let i = 1; i <= periods; i++) {
      forecast.push({
        period: i,
        predictedCount: Math.round(recentAvg)
      });
    }

    return forecast;
  }

  private getCapacityRecommendation(avgVolume: number, peakVolume: number, trend: string): string {
    if (trend === 'increasing' && avgVolume > 50) {
      return 'Consider adding more support staff. Volume is increasing and average is high.';
    }
    if (peakVolume > avgVolume * 2) {
      return 'Prepare for peak periods. Consider flexible staffing or overflow support.';
    }
    if (trend === 'stable' && avgVolume < 20) {
      return 'Current capacity is sufficient. Monitor for changes.';
    }
    return 'Capacity appears adequate. Continue monitoring trends.';
  }

  private getCategoryDescription(category: string): string {
    const descriptions: Record<string, string> = {
      'BILLING': 'Payment and subscription related issues',
      'TECHNICAL': 'Technical problems and bugs',
      'FEATURE_REQUEST': 'New feature requests and enhancements',
      'BUG': 'Software bugs and errors',
      'ACCOUNT': 'Account access and settings issues'
    };
    return descriptions[category] || 'General support inquiries';
  }

  private generatePreventiveMeasures(commonIssues: Array<{category: string, count: number}>): string[] {
    const measures: string[] = [];

    for (const issue of commonIssues) {
      switch (issue.category) {
        case 'BILLING':
          measures.push('Improve billing documentation and self-service payment portal');
          measures.push('Send proactive payment reminders before due dates');
          break;
        case 'TECHNICAL':
          measures.push('Create more technical troubleshooting guides');
          measures.push('Implement better error messages in the application');
          break;
        case 'FEATURE_REQUEST':
          measures.push('Publish public roadmap to manage expectations');
          measures.push('Create feedback portal for feature voting');
          break;
        case 'BUG':
          measures.push('Increase QA testing coverage');
          measures.push('Implement better error monitoring and logging');
          break;
        case 'ACCOUNT':
          measures.push('Simplify account setup process');
          measures.push('Add more self-service account management options');
          break;
      }
    }

    return [...new Set(measures)]; // Remove duplicates
  }

  private calculateAgentCSAT(avgFirstResponse: number, avgResolution: number): number {
    // Simulate CSAT based on response times
    let score = 5.0;
    
    if (avgFirstResponse > 60) score -= 0.5; // > 1 hour first response
    if (avgFirstResponse > 240) score -= 0.5; // > 4 hours
    if (avgResolution > 48) score -= 0.5; // > 2 days resolution
    if (avgResolution > 96) score -= 0.5; // > 4 days

    return Math.max(1, Math.round(score * 10) / 10);
  }

  private identifyImprovementAreas(
    firstResponseRate: number,
    resolutionRate: number,
    firstResponseBreaches: any[],
    _resolutionBreaches: any[]
  ): string[] {
    const areas: string[] = [];

    if (firstResponseRate < 80) {
      areas.push('First response time needs improvement. Consider automated acknowledgments.');
    }
    if (resolutionRate < 70) {
      areas.push('Resolution time is below target. Review ticket complexity and agent workload.');
    }

    // Check for priority-specific issues
    const urgentBreaches = firstResponseBreaches.filter(b => b.priority === 'URGENT').length;
    if (urgentBreaches > 5) {
      areas.push('Urgent tickets are missing SLA. Implement priority escalation system.');
    }

    if (areas.length === 0) {
      areas.push('SLA compliance is good. Continue monitoring and maintain current processes.');
    }

    return areas;
  }

  private generateExecutiveSummary(metrics: any, categoryAnalysis: any, slaCompliance: any): string {
    const topCategory = categoryAnalysis.distribution && categoryAnalysis.distribution[0] 
      ? categoryAnalysis.distribution[0].category 
      : 'N/A';
    return `Support operations summary: ${metrics.openTickets} open tickets, ${metrics.closedTickets} closed in period. ` +
      `Average resolution time: ${metrics.avgResolutionTime}h. ` +
      `Top issue category: ${topCategory}. ` +
      `SLA compliance: First Response ${slaCompliance.compliance.firstResponse.rate}%, ` +
      `Resolution ${slaCompliance.compliance.resolution.rate}%.`;
  }

  private generateInsights(metrics: any, categoryAnalysis: any, teamPerformance: any, slaCompliance: any): string[] {
    const insights: string[] = [];

    // Volume insights
    if (metrics.openTickets > metrics.closedTickets * 1.5) {
      insights.push('⚠️ Open ticket backlog is growing. Consider adding support capacity.');
    }

    // Performance insights
    if (metrics.avgResolutionTime > 72) {
      insights.push('⚠️ Resolution times are high. Review ticket complexity and agent training.');
    } else if (metrics.avgResolutionTime < 24) {
      insights.push('✅ Excellent resolution times. Team is performing well.');
    }

    // Category insights
    if (categoryAnalysis.distribution.length > 0) {
      const topCategory = categoryAnalysis.distribution[0];
      if (topCategory.percentage > 40) {
        insights.push(`📊 ${topCategory.category} represents ${topCategory.percentage}% of tickets. Consider preventive measures.`);
      }
    }

    // Team insights
    if (teamPerformance.performanceByAgent.length > 0) {
      const topPerformer = teamPerformance.performanceByAgent[0];
      insights.push(`⭐ Top performer: Agent ${topPerformer.agentId} with ${topPerformer.resolutionRate}% resolution rate.`);
    }

    // SLA insights
    if (slaCompliance.compliance.firstResponse.rate < 85) {
      insights.push('⚠️ First response SLA needs attention. Review staffing during peak hours.');
    }

    return insights;
  }
}

export const supportAnalyticsService = new SupportAnalyticsService();
