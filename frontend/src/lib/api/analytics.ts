import apiClient from './client';
import type {
  SystemHealth,
  UsageAnalytics,
  GrowthAnalytics,
  Benchmarks,
} from '../types/analytics';

const BASE_PATH = '/super-admin/analytics';

/**
 * Get system health status
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  const { data } = await apiClient.get<SystemHealth>(
    `${BASE_PATH}/system-health`
  );
  return data;
}

/**
 * Get usage analytics
 */
export async function getUsageAnalytics(
  period: string
): Promise<UsageAnalytics> {
  const { data } = await apiClient.get<UsageAnalytics>(`${BASE_PATH}/usage`, {
    params: { period },
  });
  return data;
}

/**
 * Get growth analytics
 */
export async function getGrowthAnalytics(
  period: string
): Promise<GrowthAnalytics> {
  const { data } = await apiClient.get<GrowthAnalytics>(`${BASE_PATH}/growth`, {
    params: { period },
  });
  return data;
}

/**
 * Get performance benchmarks
 */
export async function getPerformanceBenchmarks(): Promise<Benchmarks> {
  const { data } = await apiClient.get<Benchmarks>(`${BASE_PATH}/benchmarks`);
  return data;
}
