import useSWR, { mutate } from 'swr';
import type {
  SystemHealth,
  UsageAnalytics,
  GrowthAnalytics,
  Benchmarks,
} from '../types/analytics';
import * as analyticsApi from '../api/analytics';

/**
 * Hook to fetch system health status
 */
export function useSystemHealth() {
  const { data, error, isLoading } = useSWR<SystemHealth>(
    '/analytics/system-health',
    analyticsApi.getSystemHealth,
    {
      revalidateOnFocus: false,
      refreshInterval: 30000, // Refresh every 30 seconds for critical health data
    }
  );

  const refresh = () => mutate('/analytics/system-health');

  return {
    systemHealth: data,
    isLoading,
    isError: error,
    refresh,
  };
}

/**
 * Hook to fetch usage analytics
 */
export function useUsageAnalytics(period: string = '30d') {
  const { data, error, isLoading } = useSWR<UsageAnalytics>(
    ['/analytics/usage', period],
    () => analyticsApi.getUsageAnalytics(period),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  const refresh = () => mutate(['/analytics/usage', period]);

  return {
    usageAnalytics: data,
    isLoading,
    isError: error,
    refresh,
  };
}

/**
 * Hook to fetch growth analytics
 */
export function useGrowthAnalytics(period: string = '30d') {
  const { data, error, isLoading } = useSWR<GrowthAnalytics>(
    ['/analytics/growth', period],
    () => analyticsApi.getGrowthAnalytics(period),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  const refresh = () => mutate(['/analytics/growth', period]);

  return {
    growthAnalytics: data,
    isLoading,
    isError: error,
    refresh,
  };
}

/**
 * Hook to fetch performance benchmarks
 */
export function usePerformanceBenchmarks() {
  const { data, error, isLoading } = useSWR<Benchmarks>(
    '/analytics/benchmarks',
    analyticsApi.getPerformanceBenchmarks,
    {
      revalidateOnFocus: false,
      refreshInterval: 300000, // Refresh every 5 minutes
    }
  );

  const refresh = () => mutate('/analytics/benchmarks');

  return {
    benchmarks: data,
    isLoading,
    isError: error,
    refresh,
  };
}
