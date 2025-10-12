import { Status } from './api';

// Organization Types
export interface Organization {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  status: Status;
  subscriptionTier: 'trial' | 'basic' | 'professional' | 'enterprise';
  trialEndsAt?: string;
  createdAt: string;
  updatedAt: string;
  logo?: string;
  website?: string;
  address?: string;
}

export interface OrganizationConfig {
  id: string;
  organizationId: string;
  whatsapp?: {
    enabled: boolean;
    phoneNumberId?: string;
    businessAccountId?: string;
    accessToken?: string;
    webhookVerifyToken?: string;
    lastTestedAt?: string;
    status?: 'connected' | 'disconnected' | 'error';
  };
  googleSheets?: {
    enabled: boolean;
    spreadsheetId?: string;
    serviceAccountEmail?: string;
    lastSyncAt?: string;
    syncFrequency?: 'manual' | 'hourly' | 'daily';
    status?: 'connected' | 'disconnected' | 'error';
  };
  billing?: {
    currency: string;
    timezone: string;
    fiscalYearStart?: string;
  };
  features?: {
    appointments: boolean;
    billing: boolean;
    analytics: boolean;
    notifications: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationUser {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'staff' | 'doctor';
  status: Status;
  lastLoginAt?: string;
  createdAt: string;
}

export interface OrganizationStatistics {
  total: number;
  active: number;
  trial: number;
  suspended: number;
  byTier: {
    trial: number;
    basic: number;
    professional: number;
    enterprise: number;
  };
  recentSignups: number;
  churnRate: number;
}

export interface TrialLimits {
  maxPatients?: number;
  maxAppointments?: number;
  maxUsers?: number;
  maxStorage?: number; // in MB
  features?: string[];
}

// Filter Types
export interface OrganizationFilters {
  status?: Status;
  subscriptionTier?: string;
  search?: string;
  createdAfter?: string;
  createdBefore?: string;
}

// Setup Progress
export interface SetupProgress {
  organizationId: string;
  steps: {
    organizationCreated: boolean;
    whatsappConfigured: boolean;
    sheetsIntegrated: boolean;
    teamInvited: boolean;
    firstPatientAdded: boolean;
    firstAppointmentCreated: boolean;
  };
  completionPercentage: number;
  lastStepCompletedAt?: string;
  estimatedTimeToComplete?: number; // in minutes
}
