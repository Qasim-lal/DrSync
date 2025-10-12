import apiClient from './client';
import type {
  BillingOverview,
  PaymentStatusBreakdown,
  Transaction,
  TransactionFilters,
  Subscription,
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

const BASE_PATH = '/super-admin/billing';

// ========== Billing Dashboard ==========

/**
 * Get billing overview
 */
export async function getBillingOverview(): Promise<BillingOverview> {
  const { data } = await apiClient.get<BillingOverview>(
    `${BASE_PATH}/overview`
  );
  return data;
}

/**
 * Get payment status breakdown
 */
export async function getPaymentStatus(): Promise<PaymentStatusBreakdown> {
  const { data } = await apiClient.get<PaymentStatusBreakdown>(
    `${BASE_PATH}/payment-status`
  );
  return data;
}

// ========== Transactions ==========

/**
 * Get all transactions with optional filters
 */
export async function getTransactions(
  filters?: TransactionFilters
): Promise<Transaction[]> {
  const { data } = await apiClient.get<Transaction[]>(
    `${BASE_PATH}/transactions`,
    {
      params: filters,
    }
  );
  return data;
}

/**
 * Retry a failed payment
 */
export async function retryPayment(transactionId: string): Promise<void> {
  await apiClient.post(`${BASE_PATH}/transactions/${transactionId}/retry`);
}

/**
 * Process a refund
 */
export async function processRefund(
  transactionId: string,
  amount: number
): Promise<void> {
  await apiClient.post(`${BASE_PATH}/transactions/${transactionId}/refund`, {
    amount,
  });
}

// ========== Subscriptions ==========

/**
 * Get subscription lifecycle data
 */
export async function getSubscriptionLifecycle(): Promise<SubscriptionLifecycle> {
  const { data } = await apiClient.get<SubscriptionLifecycle>(
    `${BASE_PATH}/subscriptions/lifecycle`
  );
  return data;
}

/**
 * Update a subscription plan
 */
export async function updateSubscription(
  id: string,
  plan: string
): Promise<void> {
  await apiClient.patch(`${BASE_PATH}/subscriptions/${id}`, { plan });
}

/**
 * Suspend a subscription
 */
export async function suspendSubscription(
  id: string,
  reason: string
): Promise<void> {
  await apiClient.post(`${BASE_PATH}/subscriptions/${id}/suspend`, { reason });
}

/**
 * Reactivate a suspended subscription
 */
export async function reactivateSubscription(id: string): Promise<void> {
  await apiClient.post(`${BASE_PATH}/subscriptions/${id}/reactivate`);
}

// ========== Trials ==========

/**
 * Get trial overview
 */
export async function getTrialOverview(): Promise<TrialOverview> {
  const { data } = await apiClient.get<TrialOverview>(`${BASE_PATH}/trials/overview`);
  return data;
}

/**
 * Get trial abuse detection results
 */
export async function getTrialAbuseDetection(): Promise<AbuseDetection[]> {
  const { data } = await apiClient.get<AbuseDetection[]>(
    `${BASE_PATH}/trials/abuse-detection`
  );
  return data;
}

/**
 * Get trial usage for an organization
 */
export async function getTrialUsage(orgId: string): Promise<TrialUsage> {
  const { data } = await apiClient.get<TrialUsage>(
    `${BASE_PATH}/trials/${orgId}/usage`
  );
  return data;
}

/**
 * Extend a trial period
 */
export async function extendTrial(
  orgId: string,
  days: number,
  reason: string
): Promise<void> {
  await apiClient.post(`${BASE_PATH}/trials/${orgId}/extend`, {
    days,
    reason,
  });
}

/**
 * Get trial conversion statistics
 */
export async function getTrialConversions(
  period: number
): Promise<TrialConversions> {
  const { data } = await apiClient.get<TrialConversions>(
    `${BASE_PATH}/trials/conversions`,
    {
      params: { period },
    }
  );
  return data;
}

/**
 * Get trials needing action
 */
export async function getTrialsNeedingAction(): Promise<Trial[]> {
  const { data } = await apiClient.get<Trial[]>(
    `${BASE_PATH}/trials/needs-action`
  );
  return data;
}

// ========== Invoices ==========

/**
 * Get all invoices with optional filters
 */
export async function getInvoices(
  filters?: InvoiceFilters
): Promise<Invoice[]> {
  const { data } = await apiClient.get<Invoice[]>(`${BASE_PATH}/invoices`, {
    params: filters,
  });
  return data;
}

/**
 * Preview invoice for an organization
 */
export async function previewInvoice(
  orgId: string
): Promise<InvoicePreview> {
  const { data } = await apiClient.get<InvoicePreview>(
    `${BASE_PATH}/invoices/preview/${orgId}`
  );
  return data;
}

/**
 * Generate invoice for an organization
 */
export async function generateInvoice(orgId: string): Promise<Invoice> {
  const { data } = await apiClient.post<Invoice>(
    `${BASE_PATH}/invoices/generate`,
    { orgId }
  );
  return data;
}

// ========== Receipts ==========

/**
 * Get all receipts with optional filters
 */
export async function getReceipts(
  filters?: ReceiptFilters
): Promise<Receipt[]> {
  const { data } = await apiClient.get<Receipt[]>(`${BASE_PATH}/receipts`, {
    params: filters,
  });
  return data;
}

/**
 * Generate receipt for a payment
 */
export async function generateReceipt(paymentId: string): Promise<Receipt> {
  const { data } = await apiClient.post<Receipt>(
    `${BASE_PATH}/receipts/generate`,
    { paymentId }
  );
  return data;
}

// ========== Revenue Analytics ==========

/**
 * Get revenue trends
 */
export async function getRevenueTrends(
  period: string
): Promise<RevenueTrends> {
  const { data } = await apiClient.get<RevenueTrends>(
    `${BASE_PATH}/analytics/revenue-trends`,
    {
      params: { period },
    }
  );
  return data;
}

/**
 * Get customer lifetime value analysis
 */
export async function getCustomerLTV(
  segmentation?: string
): Promise<LTVAnalysis> {
  const { data } = await apiClient.get<LTVAnalysis>(
    `${BASE_PATH}/analytics/customer-ltv`,
    {
      params: { segmentation },
    }
  );
  return data;
}

/**
 * Get churn analysis
 */
export async function getChurnAnalysis(period: number): Promise<ChurnAnalysis> {
  const { data } = await apiClient.get<ChurnAnalysis>(
    `${BASE_PATH}/analytics/churn`,
    {
      params: { period },
    }
  );
  return data;
}

/**
 * Get revenue forecast
 */
export async function getRevenueForecast(): Promise<RevenueForecast> {
  const { data } = await apiClient.get<RevenueForecast>(
    `${BASE_PATH}/analytics/forecast`
  );
  return data;
}

/**
 * Get comprehensive revenue analytics
 */
export async function getRevenueAnalytics(
  period: 'week' | 'month' | 'quarter' | 'year'
): Promise<RevenueAnalytics> {
  const { data } = await apiClient.get<RevenueAnalytics>(
    `${BASE_PATH}/analytics/revenue`,
    {
      params: { period },
    }
  );
  return data;
}
