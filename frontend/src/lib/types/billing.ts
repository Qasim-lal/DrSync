import { PaymentStatus, SubscriptionStatus, DateRangeFilter } from './api';

// Billing Dashboard Types
export interface BillingOverview {
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  averageRevenuePerUser: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  churnedSubscriptions: number;
  revenueGrowth: number; // percentage
  subscriptionGrowth: number; // percentage
}

export interface PaymentStatusBreakdown {
  pending: number;
  completed: number;
  failed: number;
  refunded: number;
  totalAmount: {
    pending: number;
    completed: number;
    failed: number;
    refunded: number;
  };
}

// Transaction Types
export interface Transaction {
  id: string;
  organizationId: string;
  organizationName?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod?: string;
  description?: string;
  invoiceId?: string;
  createdAt: string;
  processedAt?: string;
  failureReason?: string;
  refundedAt?: string;
  refundAmount?: number;
}

export interface TransactionFilters extends DateRangeFilter {
  status?: PaymentStatus;
  organizationId?: string;
  minAmount?: number;
  maxAmount?: number;
}

// Subscription Types
export interface Subscription {
  id: string;
  organizationId: string;
  organizationName?: string;
  plan: 'trial' | 'basic' | 'professional' | 'enterprise';
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt?: string;
  cancelledAt?: string;
  amount: number;
  currency: string;
  billingInterval: 'monthly' | 'yearly';
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionLifecycle {
  total: number;
  byStatus: {
    active: number;
    trialing: number;
    past_due: number;
    cancelled: number;
    paused: number;
  };
  newThisMonth: number;
  cancelledThisMonth: number;
  conversionRate: number; // trial to paid conversion
  averageLifetimeValue: number;
}

// Trial Types
export interface Trial {
  id: string;
  organizationId: string;
  organizationName?: string;
  startedAt: string;
  endsAt: string;
  daysRemaining: number;
  usage: {
    patients: number;
    appointments: number;
    storage: number; // in MB
  };
  limits: {
    patients: number;
    appointments: number;
    storage: number;
  };
  conversionProbability?: number; // 0-1
  riskScore?: number; // 0-1, for abuse detection
}

export interface TrialOverview {
  activeTrials: number;
  expiringIn7Days: number;
  expiringIn30Days: number;
  averageConversionRate: number;
  totalConversions: number;
  averageDaysToConversion: number;
}

export interface AbuseDetection {
  organizationId: string;
  organizationName: string;
  riskScore: number; // 0-1
  flags: string[];
  details: {
    multipleAccounts?: boolean;
    unusualUsagePattern?: boolean;
    temporaryEmail?: boolean;
    highChurnAccount?: boolean;
  };
  detectedAt: string;
}

export interface TrialUsage {
  organizationId: string;
  period: string;
  usage: {
    patients: { current: number; limit: number; percentage: number };
    appointments: { current: number; limit: number; percentage: number };
    storage: { current: number; limit: number; percentage: number };
    users: { current: number; limit: number; percentage: number };
  };
  activityLevel: 'low' | 'medium' | 'high';
  engagementScore: number; // 0-100
}

export interface TrialConversions {
  period: number; // days
  totalTrials: number;
  converted: number;
  conversionRate: number;
  byPlan: {
    basic: number;
    professional: number;
    enterprise: number;
  };
  averageTimeToConversion: number; // days
  revenueGenerated: number;
}

// Invoice Types
export interface Invoice {
  id: string;
  invoiceNumber: string;
  organizationId: string;
  organizationName?: string;
  amount: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  dueDate: string;
  paidAt?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax?: number;
  total: number;
  createdAt: string;
  pdfUrl?: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface InvoiceFilters extends DateRangeFilter {
  status?: string;
  organizationId?: string;
}

export interface InvoicePreview {
  organizationId: string;
  organizationName: string;
  billingPeriod: {
    start: string;
    end: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
}

// Receipt Types
export interface Receipt {
  id: string;
  receiptNumber: string;
  paymentId: string;
  organizationId: string;
  organizationName?: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  issuedAt: string;
  pdfUrl?: string;
}

export interface ReceiptFilters extends DateRangeFilter {
  organizationId?: string;
}

// Revenue Analytics Types
export interface RevenueTrends {
  period: string;
  data: {
    date: string;
    revenue: number;
    subscriptions: number;
    averageRevenuePerUser: number;
  }[];
  totalRevenue: number;
  growth: number; // percentage
}

export interface LTVAnalysis {
  overallLTV: number;
  bySegment: {
    segment: string;
    ltv: number;
    customerCount: number;
    averageLifespan: number; // months
  }[];
  byPlan: {
    plan: string;
    ltv: number;
    customerCount: number;
  }[];
}

export interface ChurnAnalysis {
  period: number; // days
  churnRate: number; // percentage
  churnedCustomers: number;
  totalCustomers: number;
  revenueChurn: number;
  reasons: {
    reason: string;
    count: number;
    percentage: number;
  }[];
  byPlan: {
    plan: string;
    churnRate: number;
  }[];
}

export interface RevenueForecast {
  nextMonth: {
    projected: number;
    confidence: number; // 0-1
    range: { low: number; mid: number; high: number };
  };
  nextQuarter: {
    projected: number;
    confidence: number;
    range: { low: number; mid: number; high: number };
  };
  assumptions: string[];
  factors: {
    factor: string;
    impact: number; // percentage
  }[];
}

export interface RevenueAnalytics {
  totalRevenue: number;
  totalRevenueChange: number; // percentage
  mrr: number;
  mrrChange: number; // percentage
  arpu: number;
  arpuChange: number; // percentage
  growthRate: number; // percentage
  revenueTrend: {
    date: string;
    revenue: number;
    mrr: number;
  }[];
  revenueByPlan: {
    name: string;
    value: number;
  }[];
  revenueByCountry: {
    country: string;
    revenue: number;
  }[];
  churnRate: number;
  churnedCustomers: number;
  ltv: number;
  cacRatio: number;
}
