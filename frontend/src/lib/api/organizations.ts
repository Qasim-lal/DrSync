import apiClient from './client';
import type {
  Organization,
  OrganizationConfig,
  OrganizationUser,
  OrganizationStatistics,
  OrganizationFilters,
  TrialLimits,
  SetupProgress,
} from '../types/organization';
import type { Status } from '../types/api';

const BASE_PATH = '/super-admin/organizations';

/**
 * Get all organizations with optional filters
 */
export async function getOrganizations(
  filters?: OrganizationFilters
): Promise<Organization[]> {
  const { data } = await apiClient.get<Organization[]>(BASE_PATH, {
    params: filters,
  });
  return data;
}

/**
 * Get organization by ID
 */
export async function getOrganizationById(id: string): Promise<Organization> {
  const { data } = await apiClient.get<Organization>(`${BASE_PATH}/${id}`);
  return data;
}

/**
 * Get organization configuration
 */
export async function getOrganizationConfig(
  id: string
): Promise<OrganizationConfig> {
  const { data } = await apiClient.get<OrganizationConfig>(
    `${BASE_PATH}/${id}/config`
  );
  return data;
}

/**
 * Get organization users
 */
export async function getOrganizationUsers(
  id: string
): Promise<OrganizationUser[]> {
  const { data } = await apiClient.get<OrganizationUser[]>(
    `${BASE_PATH}/${id}/users`
  );
  return data;
}

/**
 * Update organization status
 */
export async function updateOrganizationStatus(
  id: string,
  status: Status
): Promise<void> {
  await apiClient.patch(`${BASE_PATH}/${id}/status`, { status });
}

/**
 * Update trial limits for an organization
 */
export async function updateTrialLimits(
  id: string,
  limits: TrialLimits
): Promise<void> {
  await apiClient.patch(`${BASE_PATH}/${id}/limits`, limits);
}

/**
 * Suspend an organization
 */
export async function suspendOrganization(
  id: string,
  reason: string
): Promise<void> {
  await apiClient.post(`${BASE_PATH}/${id}/suspend`, { reason });
}

/**
 * Get organization statistics
 */
export async function getOrganizationStatistics(): Promise<OrganizationStatistics> {
  const { data } = await apiClient.get<OrganizationStatistics>(
    '/super-admin/statistics/organizations'
  );
  return data;
}

/**
 * Get organization setup progress
 */
export async function getSetupProgress(id: string): Promise<SetupProgress> {
  const { data } = await apiClient.get<SetupProgress>(
    `${BASE_PATH}/${id}/setup-progress`
  );
  return data;
}
