/**
 * Dashboard API Helper
 * Typed API functions matching the exact Prisma schema
 */

// ─── Types matching Prisma schema ────────────────────────────────────────────

export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
export type RegistrationSource = 'WHATSAPP' | 'DASHBOARD' | 'GOOGLE_SHEETS' | 'API';
export type AppointmentStatus =
  | 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS'
  | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'RESCHEDULED';
export type BookingSource = 'WHATSAPP' | 'DASHBOARD' | 'PHONE' | 'WALK_IN' | 'GOOGLE_SHEETS';
export type UserRole = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'DOCTOR' | 'STAFF' | 'PROVIDER';

export interface Patient {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  gender?: Gender;
  address?: string;
  city?: string;
  country: string;
  bloodGroup?: string;
  allergies?: string;
  medicalHistory?: string;
  emergencyContact?: string;
  whatsappNumber?: string;
  preferredLanguage: string;
  isActive: boolean;
  registrationSource: RegistrationSource;
  createdAt: string;
  updatedAt: string;
}

export interface Provider {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  title?: string;
  specialization?: string;
  licenseNumber?: string;
  email?: string;
  phone?: string;
  experience?: number;
  consultationDuration?: number;
  consultationFee?: string | number;
  currency?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  organizationId: string;
  patientId: string;
  providerId: string;
  scheduledAt: string;
  duration: number;
  endTime: string;
  status: AppointmentStatus;
  bookingSource: BookingSource;
  title?: string;
  description?: string;
  consultationNotes?: string;
  createdAt: string;
  updatedAt: string;
  patient?: Pick<Patient, 'id' | 'firstName' | 'lastName' | 'phone'>;
  provider?: Pick<Provider, 'id' | 'firstName' | 'lastName' | 'specialization'>;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

type NestedPaginatedResponse<T> = {
  success: boolean;
  data?: T[] | {
    patients?: T[];
    appointments?: T[];
    providers?: T[];
    pagination?: PaginatedResponse<T>['pagination'];
  };
  pagination?: PaginatedResponse<T>['pagination'];
};

export interface DashboardStats {
  totalPatients: number;
  totalAppointments: number;
  totalProviders: number;
  appointmentsToday: number;
  appointmentsThisWeek: number;
  completedToday: number;
}

// ─── Auth helper ─────────────────────────────────────────────────────────────

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: { ...getAuthHeaders(), ...(options?.headers || {}) },
  });

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || `API error ${res.status}`);
  }

  return data;
}

function normalizePaginatedResponse<T>(
  response: NestedPaginatedResponse<T>,
  collectionKey: 'patients' | 'appointments' | 'providers'
): PaginatedResponse<T> {
  if (Array.isArray(response.data)) {
    return {
      success: response.success,
      data: response.data,
      pagination: response.pagination,
    };
  }

  const nestedData = response.data?.[collectionKey];

  return {
    success: response.success,
    data: Array.isArray(nestedData) ? nestedData : [],
    pagination: response.data?.pagination || response.pagination,
  };
}

// ─── Patients ─────────────────────────────────────────────────────────────────

export async function getPatients(params?: {
  page?: number; limit?: number; search?: string;
}): Promise<PaginatedResponse<Patient>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.search) query.set('search', params.search);
  const response = await apiFetch<NestedPaginatedResponse<Patient>>(`/api/patients?${query.toString()}`);
  return normalizePaginatedResponse(response, 'patients');
}

export async function createPatient(data: Partial<Patient>): Promise<{ success: boolean; data: Patient }> {
  return apiFetch('/api/patients', { method: 'POST', body: JSON.stringify(data) });
}

export async function updatePatient(id: string, data: Partial<Patient>): Promise<{ success: boolean; data: Patient }> {
  return apiFetch(`/api/patients/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deletePatient(id: string): Promise<{ success: boolean }> {
  return apiFetch(`/api/patients/${id}`, { method: 'DELETE' });
}

export async function getPatientStats(): Promise<{ success: boolean; data: any }> {
  return apiFetch('/api/patients/stats');
}

// ─── Appointments ─────────────────────────────────────────────────────────────

export async function getAppointments(params?: {
  page?: number; limit?: number; status?: string; date?: string;
}): Promise<PaginatedResponse<Appointment>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.status) query.set('status', params.status);
  if (params?.date) query.set('date', params.date);
  const response = await apiFetch<NestedPaginatedResponse<Appointment>>(`/api/appointments?${query.toString()}`);
  return normalizePaginatedResponse(response, 'appointments');
}

export async function createAppointment(data: Partial<Appointment>): Promise<{ success: boolean; data: Appointment }> {
  return apiFetch('/api/appointments', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateAppointment(id: string, data: Partial<Appointment>): Promise<{ success: boolean; data: Appointment }> {
  return apiFetch(`/api/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function cancelAppointment(id: string): Promise<{ success: boolean }> {
  return apiFetch(`/api/appointments/${id}`, { method: 'DELETE' });
}

export async function confirmAppointment(id: string): Promise<{ success: boolean }> {
  return apiFetch(`/api/appointments/${id}/confirm`, { method: 'POST' });
}

// ─── Providers ────────────────────────────────────────────────────────────────

export async function getProviders(): Promise<{ success: boolean; data: Provider[] }> {
  const response = await apiFetch<NestedPaginatedResponse<Provider>>('/api/providers');
  return normalizePaginatedResponse(response, 'providers');
}

export async function createProvider(data: Partial<Provider>): Promise<{ success: boolean; data: Provider }> {
  return apiFetch('/api/providers', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateProvider(id: string, data: Partial<Provider>): Promise<{ success: boolean; data: Provider }> {
  return apiFetch(`/api/providers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteProvider(id: string): Promise<{ success: boolean }> {
  return apiFetch(`/api/providers/${id}`, { method: 'DELETE' });
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getPatientAnalytics(): Promise<{ success: boolean; data: any }> {
  return apiFetch('/api/analytics/patients');
}

export async function getProviderAnalytics(): Promise<{ success: boolean; data: any }> {
  return apiFetch('/api/analytics/providers');
}

export async function getAppointmentAnalytics(): Promise<{ success: boolean; data: any }> {
  return apiFetch('/api/analytics/appointments');
}

// ─── Local user ───────────────────────────────────────────────────────────────

export interface LocalUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  organizationId: string;
  organization_id?: string;
  organization?: {
    id?: string;
  };
  organizations?: {
    id?: string;
  };
}

export function getLocalUser(): LocalUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;

    const user = JSON.parse(raw) as LocalUser;
    const firstName = user.first_name || user.firstName || '';
    const lastName = user.last_name || user.lastName || '';
    const token = localStorage.getItem('token');
    const tokenPayload = token ? decodeJwtPayload(token) : null;

    return {
      ...user,
      first_name: firstName,
      last_name: lastName,
      firstName,
      lastName,
      organizationId:
        user.organizationId ||
        user.organization_id ||
        user.organization?.id ||
        user.organizations?.id ||
        tokenPayload?.organizationId ||
        '',
    };
  } catch {
    return null;
  }
}

function decodeJwtPayload(token: string): { organizationId?: string } | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;

    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + (4 - (normalizedPayload.length % 4)) % 4,
      '='
    );

    return JSON.parse(atob(paddedPayload));
  } catch {
    return null;
  }
}

export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
}
