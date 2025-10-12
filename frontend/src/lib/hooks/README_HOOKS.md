# Custom Hooks Implementation Guide

## Completed
✅ `useOrganizations.ts` - Organization management hooks

## Remaining Hooks to Create

### 1. `useBilling.ts`
Create hooks for all billing endpoints following the same pattern:
- `useBillingOverview()` - Fetch billing overview
- `usePaymentStatus()` - Fetch payment status breakdown
- `useTransactions(filters?)` - Fetch transactions
- `useSubscriptionLifecycle()` - Fetch subscription lifecycle
- `useTrialOverview()` - Fetch trial overview
- `useTrialAbuseDetection()` - Fetch abuse detection
- `useTrialUsage(orgId)` - Fetch trial usage
- `useTrialConversions(period)` - Fetch trial conversions
- `useTrialsNeedingAction()` - Fetch trials needing action
- `useInvoices(filters?)` - Fetch invoices
- `useReceipts(filters?)` - Fetch receipts
- `useRevenueTrends(period)` - Fetch revenue trends
- `useCustomerLTV(segmentation?)` - Fetch customer LTV
- `useChurnAnalysis(period)` - Fetch churn analysis
- `useRevenueForecast()` - Fetch revenue forecast
- `useBillingActions()` - Mutations for billing actions

### 2. `useAnalytics.ts`
Create hooks for analytics endpoints:
- `useSystemHealth()` - Fetch system health
- `useUsageAnalytics(period)` - Fetch usage analytics
- `useGrowthAnalytics(period)` - Fetch growth analytics
- `usePerformanceBenchmarks()` - Fetch performance benchmarks

### 3. `useSupport.ts`
Create hooks for support endpoints:
- `useTickets(filters?)` - Fetch tickets
- `useTicket(id)` - Fetch single ticket
- `useTicketStats()` - Fetch ticket statistics
- `useArticles(filters?)` - Fetch KB articles
- `useArticle(id)` - Fetch single article
- `useKBStats()` - Fetch KB statistics
- `useTemplates(category?)` - Fetch email templates
- `useTemplate(id)` - Fetch single template
- `useCommunicationHistory(filters?)` - Fetch communication history
- `useCommunicationStats()` - Fetch communication statistics
- `useSupportMetrics(period)` - Fetch support metrics
- `useTicketVolumeTrends(days, granularity)` - Fetch volume trends
- `useCategoryAnalysis(period)` - Fetch category analysis
- `useTeamPerformance(period)` - Fetch team performance
- `useSLACompliance(period)` - Fetch SLA compliance
- `useSupportActions()` - Mutations for support actions

## Pattern to Follow

```typescript
import useSWR, { mutate } from 'swr';
import * as api from '../api/[module]';

export function useResourceName(params?) {
  const key = params ? ['/resource', params] : '/resource';
  
  const { data, error, isLoading } = useSWR(
    key,
    () => api.fetchResource(params),
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000, // Adjust as needed
      refreshInterval: undefined, // Set if auto-refresh needed
    }
  );

  const refresh = () => mutate(key);

  return {
    [resourceName]: data,
    isLoading,
    isError: error,
    refresh,
  };
}

// For mutations
export function useResourceActions() {
  const performAction = async (id: string, data: any) => {
    await api.performAction(id, data);
    mutate(`/resource/${id}`); // Invalidate specific
    mutate('/resources'); // Invalidate list
  };

  return {
    performAction,
  };
}
```

## Key Principles

1. **Null Safety**: Use `id ? key : null` to conditionally fetch
2. **Caching**: Set appropriate `dedupingInterval` (default: 10s)
3. **Auto-refresh**: Use `refreshInterval` for real-time data
4. **Mutations**: Always invalidate related cache keys
5. **Error Handling**: Return `isError` for UI to handle
6. **Loading States**: Return `isLoading` for UI feedback

## Dependencies

Install SWR first:
```bash
npm install swr
```

## Next Steps

After implementing all hooks, create an index file:
```typescript
// lib/hooks/index.ts
export * from './useOrganizations';
export * from './useBilling';
export * from './useAnalytics';
export * from './useSupport';
export * from './useAuth';
```
