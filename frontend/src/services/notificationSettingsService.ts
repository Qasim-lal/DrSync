/**
 * Notification Settings API Service - TASK-040A Phase 2
 * 
 * Service layer for interacting with notification settings endpoints.
 * Includes cost tracking, preset management, and comparison features.
 * 
 * @version 2.0
 * @date October 20, 2025
 */

import apiClient from '@/lib/api/client';

export interface NotificationSettings {
  id: string;
  organizationId: string;
  presetMode: 'BUDGET' | 'RECOMMENDED' | 'PREMIUM' | 'CUSTOM';
  bookingConfirmationsEnabled: boolean;
  remindersEnabled: boolean;
  followUpsEnabled: boolean;
  medicationRemindersEnabled: boolean;
  wellnessChecksEnabled: boolean;
  preAppointmentInstructionsEnabled: boolean;
  arrivalNotificationEnabled: boolean;
  appointmentCompletionEnabled: boolean;
  reschedulingConfirmationEnabled: boolean;
  cancellationConfirmationEnabled: boolean;
  noShowFollowupEnabled: boolean;
  paymentReminderEnabled: boolean;
  reminderTiming: string;
  customReminderMinutes: number | null;
  language: string;
  enabledChannels: string[];
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  costPerMessage: number;
  monthlyCap: number | null;
  currentMonthSpend: number;
  alertThreshold: number;
  averageMonthlyAppointments: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CostBreakdownItem {
  type: string;
  enabled: boolean;
  count: number;
  costPerMessage: number;
  cost: number;
}

export interface CostCalculation {
  totalMessages: number;
  estimatedCost: number;
  costPerMessage: number;
  breakdown: CostBreakdownItem[];
}

export interface PresetComparison {
  current: {
    mode: string;
    cost: number;
    messages: number;
  };
  budget: {
    cost: number;
    messages: number;
    savings: number;
    additionalCost: number;
  };
  recommended: {
    cost: number;
    messages: number;
    savings: number;
    additionalCost: number;
  };
  premium: {
    cost: number;
    messages: number;
    savings: number;
    additionalCost: number;
  };
}

export interface MessageCostEstimate {
  costPerMessage: number;
  totalCost: number;
  currentSpend: number;
  monthlyCap: number | null;
  percentageUsed: number;
  willExceedCap: boolean;
  remainingBudget: number | null;
}

export interface MonthlyCostSummary {
  periodYear: number;
  periodMonth: number;
  totalMessagesSent: number;
  messagesSavedBySettings: number;
  messagesBundled: number;
  estimatedCost: number;
  costSaved: number;
  breakdown: Array<{
    messageType: string;
    count: number;
    cost: number;
  }>;
}

export type PatientSegment = 'NEW' | 'REGULAR' | 'VIP' | 'AT_RISK' | 'INACTIVE';

export interface PatientSegmentResult {
  patientId: string;
  patientName: string;
  phone: string;
  segment: PatientSegment;
  appointmentCount: number;
  completedCount: number;
  noShowCount: number;
  cancelledCount: number;
  lastAppointmentAt: string | null;
  reason: string;
}

export interface PatientSegmentationSummary {
  totalPatients: number;
  counts: Record<PatientSegment, number>;
  patients: PatientSegmentResult[];
}

export interface BundleCandidate {
  patientId: string;
  appointmentId?: string;
  phone: string;
  messageType: string;
  body: string;
  scheduledFor?: string;
}

export interface BundlePlan {
  enabled: boolean;
  bundles: Array<{
    patientId: string;
    appointmentId: string | null;
    phone: string;
    messageTypes: string[];
    bodies: string[];
    bundledBody: string;
    originalMessageCount: number;
    bundledMessageCount: number;
    savedMessages: number;
  }>;
  unbundled: BundleCandidate[];
  originalMessageCount: number;
  finalMessageCount: number;
  savedMessages: number;
  estimatedSavings: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class NotificationSettingsService {
  /**
   * Get notification settings for organization
   */
  async getSettings(organizationId: string): Promise<NotificationSettings> {
    const response = await apiClient.get<ApiResponse<NotificationSettings>>(
      `/notification-settings/${organizationId}`
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch settings');
    }

    return response.data.data;
  }

  /**
   * Update notification settings
   */
  async updateSettings(
    organizationId: string,
    updates: Partial<NotificationSettings>
  ): Promise<NotificationSettings> {
    const response = await apiClient.put<ApiResponse<NotificationSettings>>(
      `/notification-settings/${organizationId}`,
      updates
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to update settings');
    }

    return response.data.data;
  }

  /**
   * Apply a preset mode (BUDGET, RECOMMENDED, PREMIUM)
   */
  async applyPreset(
    organizationId: string,
    preset: 'BUDGET' | 'RECOMMENDED' | 'PREMIUM'
  ): Promise<NotificationSettings> {
    const response = await apiClient.post<ApiResponse<NotificationSettings>>(
      `/notification-settings/${organizationId}/preset`,
      { preset }
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to apply preset');
    }

    return response.data.data;
  }

  /**
   * Calculate estimated monthly cost
   */
  async calculateCost(
    organizationId: string,
    appointments?: number
  ): Promise<CostCalculation> {
    const url = `/notification-settings/${organizationId}/calculate-cost`;

    const response = await apiClient.get<ApiResponse<CostCalculation>>(
      url,
      { params: appointments ? { appointments } : undefined }
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to calculate cost');
    }

    return response.data.data;
  }

  /**
   * Compare costs across all preset modes
   */
  async comparePresets(
    organizationId: string,
    appointments?: number
  ): Promise<PresetComparison> {
    const url = `/notification-settings/${organizationId}/compare-presets`;

    const response = await apiClient.get<ApiResponse<PresetComparison>>(
      url,
      { params: appointments ? { appointments } : undefined }
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to compare presets');
    }

    return response.data.data;
  }

  /**
   * Check if notification should be sent
   */
  async shouldSendNotification(
    organizationId: string,
    type: string,
    timestamp?: Date
  ): Promise<boolean> {
    const url = `/notification-settings/${organizationId}/should-send`;

    const response = await apiClient.get<ApiResponse<{ shouldSend: boolean }>>(
      url,
      { params: timestamp ? { type, timestamp: timestamp.toISOString() } : { type } }
    );

    if (!response.data.success || !response.data.data) {
      // Fail open - allow notification on error
      return true;
    }

    return response.data.data.shouldSend;
  }

  /**
   * Get language preference
   */
  async getLanguagePreference(organizationId: string): Promise<string> {
    const response = await apiClient.get<ApiResponse<{ language: string }>>(
      `/notification-settings/${organizationId}/language`
    );

    if (!response.data.success || !response.data.data) {
      return 'en'; // Safe default
    }

    return response.data.data.language;
  }

  /**
   * Estimate one-off or bulk message cost before sending.
   */
  async estimateMessageCost(
    organizationId: string,
    recipientCount: number,
    messageType: string = 'reminder'
  ): Promise<MessageCostEstimate> {
    const response = await apiClient.post<ApiResponse<MessageCostEstimate>>(
      `/notification-settings/${organizationId}/estimate-message-cost`,
      { recipientCount, messageType }
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to estimate message cost');
    }

    return response.data.data;
  }

  /**
   * Get tracked monthly messaging cost summary.
   */
  async getCostSummary(
    organizationId: string,
    period?: { year?: number; month?: number }
  ): Promise<MonthlyCostSummary | null> {
    const response = await apiClient.get<ApiResponse<MonthlyCostSummary | null>>(
      `/notification-settings/${organizationId}/cost-summary`,
      { params: period }
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch cost summary');
    }

    return response.data.data ?? null;
  }

  /**
   * Get deterministic patient segmentation summary.
   */
  async getPatientSegments(organizationId: string): Promise<PatientSegmentationSummary> {
    const response = await apiClient.get<ApiResponse<PatientSegmentationSummary>>(
      `/notification-settings/${organizationId}/patient-segments`
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch patient segments');
    }

    return response.data.data;
  }

  /**
   * Create a smart-bundling plan for candidate messages.
   */
  async createBundlePlan(
    organizationId: string,
    candidates: BundleCandidate[],
    trackSavings: boolean = false
  ): Promise<BundlePlan> {
    const response = await apiClient.post<ApiResponse<BundlePlan>>(
      `/notification-settings/${organizationId}/bundle-plan`,
      { candidates, trackSavings }
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to create bundle plan');
    }

    return response.data.data;
  }
}

// Export singleton instance
export default new NotificationSettingsService();
