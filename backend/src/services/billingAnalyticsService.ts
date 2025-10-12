import { PrismaClient, Prisma } from '../generated/prisma';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Billing Analytics Service
 * Handles billing overview, revenue calculations, and financial analytics
 * TASK-038B-001: Billing Dashboard Overview
 */

export interface BillingOverview {
  mrr: number;  // Monthly Recurring Revenue
  arr: number;  // Annual Recurring Revenue
  totalRevenue: number;
  outstandingPayments: number;
  failedPayments: number;
  growth: {
    mrrGrowth: number;  // Percentage
    revenueGrowth: number;  // Percentage
  };
  revenueByPlan: Record<string, number>;
  revenueByPaymentMethod: Record<string, number>;
  revenueByRegion: Record<string, number>;
}

export interface TransactionFilters {
  status?: string[];
  paymentMethod?: string[];
  organizationId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export interface PaginatedTransactions {
  transactions: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

class BillingAnalyticsService {
  /**
   * SUBTASK-038B-001-1: Get billing overview with MRR, ARR, and revenue metrics
   */
  async getBillingOverview(): Promise<BillingOverview> {
    try {
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      // Get all active subscriptions for MRR calculation
      const activeOrgs = await prisma.organization.findMany({
        where: {
          subscriptionStatus: { in: ['ACTIVE', 'TRIAL'] },
          isActive: true
        },
        select: {
          id: true,
          subscriptionPlan: true,
          doctorCount: true,
          region: true
        }
      });

      // Calculate MRR based on subscription plans and doctor count
      let mrr = 0;
      const revenueByPlan: Record<string, number> = {};

      for (const org of activeOrgs) {
        const monthlyRevenue = this.calculateMonthlyRevenue(
          org.subscriptionPlan,
          org.doctorCount
        );
        mrr += monthlyRevenue;

        const planKey = org.subscriptionPlan;
        if (!revenueByPlan[planKey]) {
          revenueByPlan[planKey] = 0;
        }
        revenueByPlan[planKey] = (revenueByPlan[planKey] || 0) + monthlyRevenue;
      }

      // Calculate ARR
      const arr = mrr * 12;

      // Get total revenue from billing history
      const totalRevenueResult = await prisma.billingHistory.aggregate({
        where: { paymentStatus: 'SUCCESS' },
        _sum: { amount: true }
      });
      const totalRevenue = Number(totalRevenueResult._sum.amount || 0);

      // Get outstanding payments
      const outstandingResult = await prisma.paymentIntent.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true }
      });
      const outstandingPayments = Number(outstandingResult._sum.amount || 0);

      // Get failed payments
      const failedResult = await prisma.paymentIntent.aggregate({
        where: { status: 'FAILED' },
        _sum: { amount: true }
      });
      const failedPayments = Number(failedResult._sum.amount || 0);

      // Calculate growth (this month vs last month)
      const thisMonthRevenue = await prisma.billingHistory.aggregate({
        where: {
          paymentStatus: 'SUCCESS',
          createdAt: { gte: thisMonthStart }
        },
        _sum: { amount: true }
      });

      const lastMonthRevenue = await prisma.billingHistory.aggregate({
        where: {
          paymentStatus: 'SUCCESS',
          createdAt: { gte: lastMonthStart, lte: lastMonthEnd }
        },
        _sum: { amount: true }
      });

      const thisMonthRev = Number(thisMonthRevenue._sum.amount || 0);
      const lastMonthRev = Number(lastMonthRevenue._sum.amount || 0);
      const revenueGrowth = lastMonthRev > 0
        ? ((thisMonthRev - lastMonthRev) / lastMonthRev) * 100
        : 0;

      // Revenue by payment method
      const paymentMethodRevenue = await prisma.billingHistory.groupBy({
        by: ['paymentMethod'],
        where: { paymentStatus: 'SUCCESS' },
        _sum: { amount: true }
      });

      const revenueByPaymentMethod: Record<string, number> = {};
      paymentMethodRevenue.forEach(item => {
        revenueByPaymentMethod[item.paymentMethod] = Number(item._sum.amount || 0);
      });

      // Revenue by region (from organizations)
      const revenueByRegion: Record<string, number> = {};
      for (const org of activeOrgs) {
        const monthlyRev = this.calculateMonthlyRevenue(
          org.subscriptionPlan,
          org.doctorCount
        );
        const regionKey = org.region;
        if (!revenueByRegion[regionKey]) {
          revenueByRegion[regionKey] = 0;
        }
        revenueByRegion[regionKey] = (revenueByRegion[regionKey] || 0) + monthlyRev;
      }

      logger.info(`Billing overview calculated: MRR=${mrr}, ARR=${arr}, Total Revenue=${totalRevenue}`);

      return {
        mrr,
        arr,
        totalRevenue,
        outstandingPayments,
        failedPayments,
        growth: {
          mrrGrowth: 0,  // Would need historical MRR tracking
          revenueGrowth
        },
        revenueByPlan,
        revenueByPaymentMethod,
        revenueByRegion
      };
    } catch (error) {
      logger.error('Error calculating billing overview:', error);
      throw new Error('Failed to get billing overview');
    }
  }

  /**
   * Calculate monthly revenue for a subscription
   */
  private calculateMonthlyRevenue(plan: string, doctorCount: number): number {
    // Pricing structure (example)
    const basePrice: Record<string, number> = {
      FREE: 0,
      BASIC: 999,  // PKR per doctor per month
      PROFESSIONAL: 1999,
      ENTERPRISE: 2999
    };

    const pricePerDoctor = basePrice[plan] || 0;
    return pricePerDoctor * doctorCount;
  }

  /**
   * SUBTASK-038B-002-1: List payment transactions with filtering
   */
  async listTransactions(filters: TransactionFilters): Promise<PaginatedTransactions> {
    try {
      const {
        status,
        paymentMethod,
        organizationId,
        dateFrom,
        dateTo,
        page = 1,
        limit = 20
      } = filters;

      const where: Prisma.PaymentIntentWhereInput = {};

      if (status && status.length > 0) {
        where.status = { in: status };
      }

      if (paymentMethod && paymentMethod.length > 0) {
        where.paymentMethod = { in: paymentMethod };
      }

      if (organizationId) {
        where.organizationId = organizationId;
      }

      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = dateFrom;
        if (dateTo) where.createdAt.lte = dateTo;
      }

      const skip = (page - 1) * limit;

      const [transactions, total] = await Promise.all([
        prisma.paymentIntent.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }),
        prisma.paymentIntent.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);
      const hasMore = page < totalPages;

      logger.info(`Listed ${transactions.length} transactions (page ${page}/${totalPages})`);

      return {
        transactions,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore
        }
      };
    } catch (error) {
      logger.error('Error listing transactions:', error);
      throw new Error('Failed to list transactions');
    }
  }

  /**
   * SUBTASK-038B-002-4: Retry a failed payment
   */
  async retryPayment(paymentIntentId: string): Promise<any> {
    try {
      const paymentIntent = await prisma.paymentIntent.findUnique({
        where: { id: paymentIntentId }
      });

      if (!paymentIntent) {
        throw new Error('Payment intent not found');
      }

      if (paymentIntent.status !== 'FAILED') {
        throw new Error('Can only retry failed payments');
      }

      if (paymentIntent.retryCount >= paymentIntent.maxRetries) {
        throw new Error('Maximum retry attempts reached');
      }

      // Update payment intent for retry
      const updated = await prisma.paymentIntent.update({
        where: { id: paymentIntentId },
        data: {
          status: 'PENDING',
          retryCount: paymentIntent.retryCount + 1,
          nextRetryAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
          updatedAt: new Date()
        }
      });

      logger.info(`Payment intent ${paymentIntentId} queued for retry (attempt ${updated.retryCount})`);

      return updated;
    } catch (error) {
      logger.error(`Error retrying payment ${paymentIntentId}:`, error);
      throw error;
    }
  }

  /**
   * SUBTASK-038B-002-5: Process a refund
   */
  async processRefund(
    paymentIntentId: string,
    amount: number,
    reason: string
  ): Promise<any> {
    try {
      const paymentIntent = await prisma.paymentIntent.findUnique({
        where: { id: paymentIntentId }
      });

      if (!paymentIntent) {
        throw new Error('Payment intent not found');
      }

      if (paymentIntent.status !== 'SUCCESS') {
        throw new Error('Can only refund successful payments');
      }

      // Update payment intent
      const updated = await prisma.paymentIntent.update({
        where: { id: paymentIntentId },
        data: {
          status: 'CANCELLED',
          failureReason: `REFUNDED: ${reason}`,
          updatedAt: new Date()
        }
      });

      // Log refund in audit log
      logger.warn(`Payment intent ${paymentIntentId} refunded. Amount: ${amount}, Reason: ${reason}`);

      return updated;
    } catch (error) {
      logger.error(`Error processing refund for ${paymentIntentId}:`, error);
      throw error;
    }
  }

  /**
   * SUBTASK-038B-002-2: Get payment status breakdown
   */
  async getPaymentStatusBreakdown(): Promise<Record<string, { count: number; amount: number }>> {
    try {
      const statusGroups = await prisma.paymentIntent.groupBy({
        by: ['status'],
        _count: true,
        _sum: { amount: true }
      });

      const breakdown: Record<string, { count: number; amount: number }> = {};

      statusGroups.forEach(group => {
        breakdown[group.status] = {
          count: group._count,
          amount: Number(group._sum.amount || 0)
        };
      });

      return breakdown;
    } catch (error) {
      logger.error('Error getting payment status breakdown:', error);
      throw new Error('Failed to get payment status breakdown');
    }
  }

  // ============================================================================
  // SUBTASK-038B-005: INVOICE & RECEIPT MANAGEMENT
  // ============================================================================

  /**
   * SUBTASK-038B-005-1: List invoices with filtering
   */
  async listInvoices(filters: {
    organizationId?: string;
    status?: string[];
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
  }): Promise<any> {
    try {
      const { organizationId, status, dateFrom, dateTo, page = 1, limit = 20 } = filters;
      
      const where: any = {};
      
      if (organizationId) {
        where.organizationId = organizationId;
      }
      
      if (status && status.length > 0) {
        where.paymentStatus = { in: status };
      }
      
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = dateFrom;
        if (dateTo) where.createdAt.lte = dateTo;
      }
      
      const skip = (page - 1) * limit;
      
      const [invoices, total] = await Promise.all([
        prisma.billingHistory.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }),
        prisma.billingHistory.count({ where })
      ]);
      
      const totalPages = Math.ceil(total / limit);
      
      logger.info(`Listed ${invoices.length} invoices (page ${page}/${totalPages})`);
      
      return {
        invoices,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore: page < totalPages
        }
      };
    } catch (error) {
      logger.error('Error listing invoices:', error);
      throw new Error('Failed to list invoices');
    }
  }

  /**
   * SUBTASK-038B-005-2: Generate invoice for a billing record
   */
  async generateInvoice(billingHistoryId: string): Promise<any> {
    try {
      const billing = await prisma.billingHistory.findUnique({
        where: { id: billingHistoryId },
        include: {
          organization: true
        }
      });
      
      if (!billing) {
        throw new Error('Billing record not found');
      }
      
      // In a real implementation, this would generate a PDF invoice
      const invoice = {
        invoiceNumber: `INV-${billing.id.slice(0, 8).toUpperCase()}`,
        date: billing.createdAt,
        dueDate: billing.createdAt, // Same day for historical invoices
        organizationName: billing.organization.name,
        organizationEmail: billing.organization.email,
        billingPeriod: billing.billingPeriod,
        items: [
          {
            description: `${billing.organization.subscriptionPlan} Plan - ${billing.doctorCount} doctor(s)`,
            quantity: billing.doctorCount,
            unitPrice: Number(billing.amount) / billing.doctorCount,
            total: Number(billing.amount)
          }
        ],
        subtotal: Number(billing.amount),
        tax: 0,
        total: Number(billing.amount),
        currency: billing.currency,
        paymentStatus: billing.paymentStatus,
        transactionId: billing.transactionId
      };
      
      logger.info(`Generated invoice ${invoice.invoiceNumber} for billing ${billingHistoryId}`);
      
      return invoice;
    } catch (error) {
      logger.error('Error generating invoice:', error);
      throw error;
    }
  }

  /**
   * SUBTASK-038B-005-4: Generate receipt for successful payment
   */
  async generateReceipt(paymentIntentId: string): Promise<any> {
    try {
      const payment = await prisma.paymentIntent.findUnique({
        where: { id: paymentIntentId },
        include: {
          organization: true
        }
      });
      
      if (!payment) {
        throw new Error('Payment not found');
      }
      
      if (payment.status !== 'SUCCESS') {
        throw new Error('Can only generate receipts for successful payments');
      }
      
      const receipt = {
        receiptNumber: `REC-${payment.id.slice(0, 8).toUpperCase()}`,
        date: payment.updatedAt || payment.createdAt,
        organizationName: payment.organization.name,
        organizationEmail: payment.organization.email,
        paymentMethod: payment.paymentMethod,
        amount: Number(payment.amount),
        currency: payment.currency,
        transactionId: payment.gatewayIntentId || payment.id,
        billingPeriod: payment.billingPeriod,
        description: `Payment for ${payment.subscriptionType} subscription - ${payment.doctorCount} doctor(s)`,
        status: 'PAID'
      };
      
      logger.info(`Generated receipt ${receipt.receiptNumber} for payment ${paymentIntentId}`);
      
      return receipt;
    } catch (error) {
      logger.error('Error generating receipt:', error);
      throw error;
    }
  }

  // ============================================================================
  // SUBTASK-038B-006: REVENUE REPORTS & ANALYTICS
  // ============================================================================

  /**
   * SUBTASK-038B-006-1: Revenue trend analysis
   */
  async getRevenueTrends(params: {
    granularity: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    startDate: Date;
    endDate: Date;
  }): Promise<any> {
    try {
      const { granularity, startDate, endDate } = params;
      
      // Get all successful payments in the date range
      const payments = await prisma.billingHistory.findMany({
        where: {
          paymentStatus: 'SUCCESS',
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { createdAt: 'asc' },
        select: {
          createdAt: true,
          amount: true,
          currency: true
        }
      });
      
      // Group payments by time period
      const trends: Record<string, { revenue: number; count: number }> = {};
      
      payments.forEach(payment => {
        const periodKey = this.getPeriodKey(payment.createdAt, granularity);
        
        if (!trends[periodKey]) {
          trends[periodKey] = { revenue: 0, count: 0 };
        }
        
        trends[periodKey].revenue += Number(payment.amount);
        trends[periodKey].count += 1;
      });
      
      // Convert to array format
      const trendData = Object.entries(trends).map(([period, data]) => ({
        period,
        revenue: data.revenue,
        transactionCount: data.count,
        averageTransactionValue: data.count > 0 ? data.revenue / data.count : 0
      }));
      
      logger.info(`Generated revenue trends: ${trendData.length} periods`);
      
      return {
        granularity,
        startDate,
        endDate,
        trends: trendData,
        totalRevenue: trendData.reduce((sum, t) => sum + t.revenue, 0),
        totalTransactions: trendData.reduce((sum, t) => sum + t.transactionCount, 0)
      };
    } catch (error) {
      logger.error('Error getting revenue trends:', error);
      throw new Error('Failed to get revenue trends');
    }
  }

  /**
   * Helper: Get period key for grouping
   */
  private getPeriodKey(date: Date, granularity: string): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    switch (granularity) {
      case 'daily':
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      case 'weekly':
        const weekNum = Math.ceil(day / 7);
        return `${year}-W${String(month).padStart(2, '0')}-${weekNum}`;
      case 'monthly':
        return `${year}-${String(month).padStart(2, '0')}`;
      case 'quarterly':
        const quarter = Math.ceil(month / 3);
        return `${year}-Q${quarter}`;
      case 'yearly':
        return `${year}`;
      default:
        return `${year}-${String(month).padStart(2, '0')}`;
    }
  }

  /**
   * SUBTASK-038B-006-3: Customer Lifetime Value (LTV) calculation
   */
  async calculateLTV(params: {
    segmentBy?: 'plan' | 'region' | 'organizationType';
  } = {}): Promise<any> {
    try {
      const { segmentBy } = params;
      
      // Get all organizations with their total payments
      const organizations = await prisma.organization.findMany({
        where: {
          subscriptionStatus: { in: ['ACTIVE', 'TRIAL', 'CANCELLED'] }
        },
        select: {
          id: true,
          subscriptionPlan: true,
          region: true,
          organizationType: true,
          createdAt: true,
          billingHistory: {
            where: { paymentStatus: 'SUCCESS' },
            select: { amount: true }
          }
        }
      });
      
      // Calculate LTV per organization
      const ltvData = organizations.map(org => {
        const totalRevenue = org.billingHistory.reduce(
          (sum, payment) => sum + Number(payment.amount),
          0
        );
        
        const lifespanMonths = Math.max(
          1,
          Math.ceil(
            (new Date().getTime() - org.createdAt.getTime()) / (30 * 24 * 60 * 60 * 1000)
          )
        );
        
        return {
          organizationId: org.id,
          subscriptionPlan: org.subscriptionPlan,
          region: org.region,
          organizationType: org.organizationType,
          totalRevenue,
          lifespanMonths,
          ltv: totalRevenue,
          averageMonthlyRevenue: totalRevenue / lifespanMonths
        };
      });
      
      // Calculate aggregate LTV
      const totalLTV = ltvData.reduce((sum, org) => sum + org.ltv, 0);
      const averageLTV = ltvData.length > 0 ? totalLTV / ltvData.length : 0;
      
      // Segment if requested
      let segments: Record<string, any> = {};
      if (segmentBy && ltvData.length > 0) {
        segments = ltvData.reduce((acc: any, org: any) => {
          const key = org[segmentBy];
          if (!acc[key]) {
            acc[key] = { totalLTV: 0, count: 0, organizations: [] };
          }
          acc[key].totalLTV += org.ltv;
          acc[key].count += 1;
          acc[key].organizations.push(org);
          return acc;
        }, {});
        
        // Calculate average per segment
        Object.keys(segments).forEach(key => {
          segments[key].averageLTV = segments[key].totalLTV / segments[key].count;
        });
      }
      
      logger.info(`Calculated LTV for ${ltvData.length} organizations`);
      
      return {
        totalOrganizations: ltvData.length,
        totalLTV,
        averageLTV,
        ...(segmentBy && { segmentBy, segments })
      };
    } catch (error) {
      logger.error('Error calculating LTV:', error);
      throw new Error('Failed to calculate LTV');
    }
  }

  /**
   * SUBTASK-038B-006-4: Churn analysis
   */
  async analyzeChurn(params: {
    startDate: Date;
    endDate: Date;
  }): Promise<any> {
    try {
      const { startDate, endDate } = params;
      
      // Get organizations that were active at start of period
      const activeAtStart = await prisma.organization.count({
        where: {
          createdAt: { lt: startDate },
          subscriptionStatus: { in: ['ACTIVE', 'TRIAL'] }
        }
      });
      
      // Get organizations that cancelled during period
      const cancelledDuringPeriod = await prisma.organization.count({
        where: {
          subscriptionStatus: 'CANCELLED',
          updatedAt: {
            gte: startDate,
            lte: endDate
          }
        }
      });
      
      // Get revenue lost from churned customers
      const churnedOrgs = await prisma.organization.findMany({
        where: {
          subscriptionStatus: 'CANCELLED',
          updatedAt: {
            gte: startDate,
            lte: endDate
          }
        },
        select: {
          subscriptionPlan: true,
          doctorCount: true
        }
      });
      
      let revenueChurn = 0;
      churnedOrgs.forEach(org => {
        revenueChurn += this.calculateMonthlyRevenue(org.subscriptionPlan, org.doctorCount);
      });
      
      const churnRate = activeAtStart > 0 ? (cancelledDuringPeriod / activeAtStart) * 100 : 0;
      
      logger.info(`Churn analysis: ${cancelledDuringPeriod} churned out of ${activeAtStart} (${churnRate.toFixed(2)}%)`);
      
      return {
        period: { startDate, endDate },
        activeOrganizationsAtStart: activeAtStart,
        churnedOrganizations: cancelledDuringPeriod,
        churnRate,
        monthlyRevenueChurn: revenueChurn,
        annualRevenueChurn: revenueChurn * 12
      };
    } catch (error) {
      logger.error('Error analyzing churn:', error);
      throw new Error('Failed to analyze churn');
    }
  }

  /**
   * SUBTASK-038B-006-5: Revenue forecast
   */
  async generateRevenueForecast(params: {
    months: number;
  }): Promise<any> {
    try {
      const { months = 12 } = params;
      
      // Get current MRR
      const billingOverview = await this.getBillingOverview();
      const currentMRR = billingOverview.mrr;
      const currentGrowthRate = billingOverview.growth.mrrGrowth || 5; // Default 5% if no historical data
      
      // Simple forecast based on current MRR and growth rate
      const forecast = [];
      let projectedMRR = currentMRR;
      
      for (let i = 1; i <= months; i++) {
        // Apply growth rate
        projectedMRR = projectedMRR * (1 + currentGrowthRate / 100);
        
        const monthDate = new Date();
        monthDate.setMonth(monthDate.getMonth() + i);
        
        forecast.push({
          month: i,
          date: monthDate.toISOString().slice(0, 7), // YYYY-MM format
          projectedMRR: Math.round(projectedMRR),
          projectedARR: Math.round(projectedMRR * 12),
          // Confidence intervals (±20% for simplicity)
          bestCase: Math.round(projectedMRR * 1.2),
          worstCase: Math.round(projectedMRR * 0.8)
        });
      }
      
      logger.info(`Generated ${months}-month revenue forecast`);
      
      return {
        currentMRR,
        monthlyGrowthRate: currentGrowthRate,
        forecastMonths: months,
        forecast,
        assumptions: [
          `Based on current MRR of ${currentMRR}`,
          `Assumes ${currentGrowthRate}% monthly growth rate`,
          'Best/worst case scenarios use ±20% variance'
        ]
      };
    } catch (error) {
      logger.error('Error generating revenue forecast:', error);
      throw new Error('Failed to generate revenue forecast');
    }
  }
}

// Export singleton instance
export const billingAnalyticsService = new BillingAnalyticsService();
