import useSWR, { mutate } from 'swr';
import type {
  BillingOverview,
  PaymentStatusBreakdown,
  Transaction,
  TransactionFilters,
  SubscriptionLifecycle,
  Trial,
  TrialOverview,
  AbuseDetection,
  TrialUsage,
  TrialConversions,
  Invoice,
  InvoiceFilters,
  InvoicePreview,
  Receipt,
  ReceiptFilters,
  RevenueTrends,
  LTVAnalysis,
  ChurnAnalysis,
  RevenueForecast,
  RevenueAnalytics,
} from '../types/billing';
import * as billingApi from '../api/billing';

// ========== Dashboard ==========

/**
 * Hook to fetch billing overview
 */
export function useBillingOverview() {
  const { data, error, isLoading } = useSWR<BillingOverview>(
    '/billing/overview',
    billingApi.getBillingOverview,
    {
      revalidateOnFocus: false,
      refreshInterval: 60000, // Refresh every minute
    }
  );

  const refresh = () => mutate('/billing/overview');

  return {
    overview: data,
    isLoading,
    isError: error,
    refresh,
  };
}

/**
 * Hook to fetch payment status breakdown
 */
export function usePaymentStatus() {
  const { data, error, isLoading } = useSWR<PaymentStatusBreakdown>(
    '/billing/payment-status',
    billingApi.getPaymentStatus,
    {
      revalidateOnFocus: false,
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );

  const refresh = () => mutate('/billing/payment-status');

  return {
    paymentStatus: data,
    isLoading,
    isError: error,
    refresh,
  };
}

// ========== Transactions ==========

/**
 * Hook to fetch transactions with optional filters
 */
export function useTransactions(filters?: TransactionFilters) {
  const key = filters ? ['/billing/transactions', filters] : '/billing/transactions';

  const { data, error, isLoading } = useSWR<Transaction[]>(
    key,
    () => billingApi.getTransactions(filters),
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  );

  const refresh = () => mutate(key);

  return {
    transactions: data,
    isLoading,
    isError: error,
    refresh,
  };
}

// ========== Subscriptions ==========

/**
 * Hook to fetch subscription lifecycle data
 */
export function useSubscriptionLifecycle() {
  const { data, error, isLoading } = useSWR<SubscriptionLifecycle>(
    '/billing/subscriptions/lifecycle',
    billingApi.getSubscriptionLifecycle,
    {
      revalidateOnFocus: false,
      refreshInterval: 60000,
    }
  );

  const refresh = () => mutate('/billing/subscriptions/lifecycle');

  return {
    lifecycle: data,
    isLoading,
    isError: error,
    refresh,
  };
}

// ========== Trials ==========

/**
 * Hook to fetch trial overview
 */
export function useTrialOverview() {
  const { data, error, isLoading } = useSWR<TrialOverview>(
    '/billing/trials/overview',
    billingApi.getTrialOverview,
    {
      revalidateOnFocus: false,
      refreshInterval: 60000,
    }
  );

  const refresh = () => mutate('/billing/trials/overview');

  return {
    trialOverview: data,
    isLoading,
    isError: error,
    refresh,
  };
}

/**
 * Hook to fetch trial abuse detection
 */
export function useTrialAbuseDetection() {
  const { data, error, isLoading } = useSWR<AbuseDetection[]>(
    '/billing/trials/abuse-detection',
    billingApi.getTrialAbuseDetection,
    {
      revalidateOnFocus: false,
      refreshInterval: 300000, // Refresh every 5 minutes
    }
  );

  const refresh = () => mutate('/billing/trials/abuse-detection');

  return {
    abuseDetection: data,
    isLoading,
    isError: error,
    refresh,
  };
}

/**
 * Hook to fetch trial usage for an organization
 */
export function useTrialUsage(orgId: string | null) {
  const { data, error, isLoading } = useSWR<TrialUsage>(
    orgId ? `/billing/trials/${orgId}/usage` : null,
    () => (orgId ? billingApi.getTrialUsage(orgId) : null),
    {
      revalidateOnFocus: false,
      refreshInterval: 60000,
    }
  );

  const refresh = () => orgId && mutate(`/billing/trials/${orgId}/usage`);

  return {
    trialUsage: data,
    isLoading,
    isError: error,
    refresh,
  };
}

/**
 * Hook to fetch trial conversions
 */
export function useTrialConversions(period: number = 30) {
  const { data, error, isLoading } = useSWR<TrialConversions>(
    ['/billing/trials/conversions', period],
    () => billingApi.getTrialConversions(period),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  const refresh = () => mutate(['/billing/trials/conversions', period]);

  return {
    conversions: data,
    isLoading,
    isError: error,
    refresh,
  };
}

/**
 * Hook to fetch trials needing action
 */
export function useTrialsNeedingAction() {
  const { data, error, isLoading } = useSWR<Trial[]>(
    '/billing/trials/needs-action',
    billingApi.getTrialsNeedingAction,
    {
      revalidateOnFocus: false,
      refreshInterval: 120000, // Refresh every 2 minutes
    }
  );

  const refresh = () => mutate('/billing/trials/needs-action');

  return {
    trialsNeedingAction: data,
    isLoading,
    isError: error,
    refresh,
  };
}

// ========== Invoices ==========

/**
 * Hook to fetch invoices with optional filters
 */
export function useInvoices(filters?: InvoiceFilters) {
  const key = filters ? ['/billing/invoices', filters] : '/billing/invoices';

  const { data, error, isLoading } = useSWR<Invoice[]>(
    key,
    () => billingApi.getInvoices(filters),
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  );

  const refresh = () => mutate(key);

  return {
    invoices: data,
    isLoading,
    isError: error,
    refresh,
  };
}

/**
 * Hook to fetch invoice preview
 */
export function useInvoicePreview(orgId: string | null) {
  const { data, error, isLoading } = useSWR<InvoicePreview>(
    orgId ? `/billing/invoices/preview/${orgId}` : null,
    () => (orgId ? billingApi.previewInvoice(orgId) : null),
    {
      revalidateOnFocus: false,
    }
  );

  const refresh = () => orgId && mutate(`/billing/invoices/preview/${orgId}`);

  return {
    invoicePreview: data,
    isLoading,
    isError: error,
    refresh,
  };
}

// ========== Receipts ==========

/**
 * Hook to fetch receipts with optional filters
 */
export function useReceipts(filters?: ReceiptFilters) {
  const key = filters ? ['/billing/receipts', filters] : '/billing/receipts';

  const { data, error, isLoading } = useSWR<Receipt[]>(
    key,
    () => billingApi.getReceipts(filters),
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  );

  const refresh = () => mutate(key);

  return {
    receipts: data,
    isLoading,
    isError: error,
    refresh,
  };
}

// ========== Revenue Analytics ==========

/**
 * Hook to fetch revenue trends
 */
export function useRevenueTrends(period: string = '30d') {
  const { data, error, isLoading } = useSWR<RevenueTrends>(
    ['/billing/analytics/revenue-trends', period],
    () => billingApi.getRevenueTrends(period),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  const refresh = () => mutate(['/billing/analytics/revenue-trends', period]);

  return {
    revenueTrends: data,
    isLoading,
    isError: error,
    refresh,
  };
}

/**
 * Hook to fetch customer LTV
 */
export function useCustomerLTV(segmentation?: string) {
  const key = segmentation
    ? ['/billing/analytics/customer-ltv', segmentation]
    : '/billing/analytics/customer-ltv';

  const { data, error, isLoading } = useSWR<LTVAnalysis>(
    key,
    () => billingApi.getCustomerLTV(segmentation),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  const refresh = () => mutate(key);

  return {
    ltvAnalysis: data,
    isLoading,
    isError: error,
    refresh,
  };
}

/**
 * Hook to fetch churn analysis
 */
export function useChurnAnalysis(period: number = 30) {
  const { data, error, isLoading } = useSWR<ChurnAnalysis>(
    ['/billing/analytics/churn', period],
    () => billingApi.getChurnAnalysis(period),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  const refresh = () => mutate(['/billing/analytics/churn', period]);

  return {
    churnAnalysis: data,
    isLoading,
    isError: error,
    refresh,
  };
}

/**
 * Hook to fetch revenue forecast
 */
export function useRevenueForecast() {
  const { data, error, isLoading } = useSWR<RevenueForecast>(
    '/billing/analytics/forecast',
    billingApi.getRevenueForecast,
    {
      revalidateOnFocus: false,
      refreshInterval: 3600000, // Refresh every hour
    }
  );

  const refresh = () => mutate('/billing/analytics/forecast');

  return {
    forecast: data,
    isLoading,
    isError: error,
    refresh,
  };
}

/**
 * Hook to fetch comprehensive revenue analytics
 */
export function useRevenueAnalytics(
  period: 'week' | 'month' | 'quarter' | 'year' = 'month'
) {
  const { data, error, isLoading } = useSWR<RevenueAnalytics>(
    ['/billing/analytics/revenue', period],
    () => billingApi.getRevenueAnalytics(period),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  const refresh = () => mutate(['/billing/analytics/revenue', period]);

  return {
    analytics: data,
    isLoading,
    isError: error,
    refresh,
  };
}

// ========== Mutations ==========

/**
 * Hook with mutations for billing actions
 */
export function useBillingActions() {
  const retryPayment = async (transactionId: string) => {
    await billingApi.retryPayment(transactionId);
    mutate('/billing/transactions');
    mutate('/billing/payment-status');
  };

  const processRefund = async (transactionId: string, amount: number) => {
    await billingApi.processRefund(transactionId, amount);
    mutate('/billing/transactions');
    mutate('/billing/overview');
  };

  const updateSubscription = async (id: string, plan: string) => {
    await billingApi.updateSubscription(id, plan);
    mutate('/billing/subscriptions/lifecycle');
  };

  const suspendSubscription = async (id: string, reason: string) => {
    await billingApi.suspendSubscription(id, reason);
    mutate('/billing/subscriptions/lifecycle');
  };

  const reactivateSubscription = async (id: string) => {
    await billingApi.reactivateSubscription(id);
    mutate('/billing/subscriptions/lifecycle');
  };

  const extendTrial = async (orgId: string, days: number, reason: string) => {
    await billingApi.extendTrial(orgId, days, reason);
    mutate(`/billing/trials/${orgId}/usage`);
    mutate('/billing/trials/overview');
    mutate('/billing/trials/needs-action');
  };

  const generateInvoice = async (orgId: string) => {
    const invoice = await billingApi.generateInvoice(orgId);
    mutate('/billing/invoices');
    return invoice;
  };

  const generateReceipt = async (paymentId: string) => {
    const receipt = await billingApi.generateReceipt(paymentId);
    mutate('/billing/receipts');
    return receipt;
  };

  return {
    retryPayment,
    processRefund,
    updateSubscription,
    suspendSubscription,
    reactivateSubscription,
    extendTrial,
    generateInvoice,
    generateReceipt,
  };
}
