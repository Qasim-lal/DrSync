/**
 * Notification Settings API Service - TASK-040A Phase 2
 * 
 * Service layer for interacting with notification settings endpoints.
 * Includes cost tracking, preset management, and comparison features.
 * 
 * @version 2.0
 * @date October 20, 2025
 */

import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

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

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class NotificationSettingsService {
  private getAuthHeaders() {
    // Get auth token from session/cookie
    // This would be handled by next-auth or your auth solution
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get notification settings for organization
   */
  async getSettings(organizationId: string): Promise<NotificationSettings> {
    const response = await axios.get<ApiResponse<NotificationSettings>>(
      `${API_BASE_URL}/notification-settings/${organizationId}`,
      { headers: this.getAuthHeaders() }
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
    const response = await axios.put<ApiResponse<NotificationSettings>>(
      `${API_BASE_URL}/notification-settings/${organizationId}`,
      updates,
      { headers: this.getAuthHeaders() }
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
    const response = await axios.post<ApiResponse<NotificationSettings>>(
      `${API_BASE_URL}/notification-settings/${organizationId}/preset`,
      { preset },
      { headers: this.getAuthHeaders() }
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
    const url = appointments
      ? `${API_BASE_URL}/notification-settings/${organizationId}/calculate-cost?appointments=${appointments}`
      : `${API_BASE_URL}/notification-settings/${organizationId}/calculate-cost`;

    const response = await axios.get<ApiResponse<CostCalculation>>(
      url,
      { headers: this.getAuthHeaders() }
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
    const url = appointments
      ? `${API_BASE_URL}/notification-settings/${organizationId}/compare-presets?appointments=${appointments}`
      : `${API_BASE_URL}/notification-settings/${organizationId}/compare-presets`;

    const response = await axios.get<ApiResponse<PresetComparison>>(
      url,
      { headers: this.getAuthHeaders() }
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
    const url = timestamp
      ? `${API_BASE_URL}/notification-settings/${organizationId}/should-send?type=${type}&timestamp=${timestamp.toISOString()}`
      : `${API_BASE_URL}/notification-settings/${organizationId}/should-send?type=${type}`;

    const response = await axios.get<ApiResponse<{ shouldSend: boolean }>>(
      url,
      { headers: this.getAuthHeaders() }
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
    const response = await axios.get<ApiResponse<{ language: string }>>(
      `${API_BASE_URL}/notification-settings/${organizationId}/language`,
      { headers: this.getAuthHeaders() }
    );

    if (!response.data.success || !response.data.data) {
      return 'en'; // Safe default
    }

    return response.data.data.language;
  }
}

// Export singleton instance
export default new NotificationSettingsService();
