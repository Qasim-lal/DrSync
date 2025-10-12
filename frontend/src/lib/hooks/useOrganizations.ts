import useSWR, { mutate } from 'swr';
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
import * as organizationsApi from '../api/organizations';

/**
 * Hook to fetch all organizations with optional filters
 */
export function useOrganizations(filters?: OrganizationFilters) {
  const key = filters ? ['/organizations', filters] : '/organizations';
  
  const { data, error, isLoading } = useSWR<Organization[]>(
    key,
    () => organizationsApi.getOrganizations(filters),
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  );

  const refresh = () => mutate(key);

  return {
    organizations: data,
    isLoading,
    isError: error,
    refresh,
  };
}

/**
 * Hook to fetch a single organization by ID
 */
export function useOrganization(id: string | null) {
  const { data, error, isLoading } = useSWR<Organization>(
    id ? `/organizations/${id}` : null,
    () => (id ? organizationsApi.getOrganizationById(id) : null),
    {
      revalidateOnFocus: false,
    }
  );

  const refresh = () => id && mutate(`/organizations/${id}`);

  return {
    organization: data,
    isLoading,
    isError: error,
    refresh,
  };
}

/**
 * Hook to fetch organization configuration
 */
export function useOrganizationConfig(id: string | null) {
  const { data, error, isLoading } = useSWR<OrganizationConfig>(
    id ? `/organizations/${id}/config` : null,
    () => (id ? organizationsApi.getOrganizationConfig(id) : null),
    {
      revalidateOnFocus: false,
    }
  );

  const refresh = () => id && mutate(`/organizations/${id}/config`);

  return {
    config: data,
    isLoading,
    isError: error,
    refresh,
  };
}

/**
 * Hook to fetch organization users
 */
export function useOrganizationUsers(id: string | null) {
  const { data, error, isLoading } = useSWR<OrganizationUser[]>(
    id ? `/organizations/${id}/users` : null,
    () => (id ? organizationsApi.getOrganizationUsers(id) : null),
    {
      revalidateOnFocus: false,
    }
  );

  const refresh = () => id && mutate(`/organizations/${id}/users`);

  return {
    users: data,
    isLoading,
    isError: error,
    refresh,
  };
}

/**
 * Hook to fetch organization statistics
 */
export function useOrganizationStatistics() {
  const { data, error, isLoading } = useSWR<OrganizationStatistics>(
    '/statistics/organizations',
    organizationsApi.getOrganizationStatistics,
    {
      revalidateOnFocus: false,
      refreshInterval: 60000, // Refresh every minute
    }
  );

  const refresh = () => mutate('/statistics/organizations');

  return {
    statistics: data,
    isLoading,
    isError: error,
    refresh,
  };
}

/**
 * Hook to fetch setup progress
 */
export function useSetupProgress(id: string | null) {
  const { data, error, isLoading } = useSWR<SetupProgress>(
    id ? `/organizations/${id}/setup-progress` : null,
    () => (id ? organizationsApi.getSetupProgress(id) : null),
    {
      revalidateOnFocus: false,
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );

  const refresh = () => id && mutate(`/organizations/${id}/setup-progress`);

  return {
    progress: data,
    isLoading,
    isError: error,
    refresh,
  };
}

/**
 * Hook with mutations for organization actions
 */
export function useOrganizationActions() {
  const updateStatus = async (id: string, status: Status) => {
    await organizationsApi.updateOrganizationStatus(id, status);
    mutate(`/organizations/${id}`);
    mutate('/organizations');
  };

  const updateTrialLimits = async (id: string, limits: TrialLimits) => {
    await organizationsApi.updateTrialLimits(id, limits);
    mutate(`/organizations/${id}`);
  };

  const suspendOrganization = async (id: string, reason: string) => {
    await organizationsApi.suspendOrganization(id, reason);
    mutate(`/organizations/${id}`);
    mutate('/organizations');
  };

  return {
    updateStatus,
    updateTrialLimits,
    suspendOrganization,
  };
}
