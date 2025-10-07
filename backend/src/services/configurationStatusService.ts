/**
 * Configuration Status Service
 * Provides overall configuration status for organizations
 */

import { getPrismaClient } from './prisma';

const prisma = getPrismaClient();

export interface ConfigurationStatus {
  whatsapp: {
    configured: boolean;
    phoneNumber?: string;
    phoneVerified: boolean;
    lastUpdated?: Date;
  };
  googleSheets: {
    configured: boolean;
    sheetsId?: string;
    syncEnabled: boolean;
    lastSynced?: Date;
  };
  staffInvitations: {
    total: number;
    pending: number;
    accepted: number;
    expired: number;
  };
  setupProgress: {
    overall: number; // 0-100
    steps: {
      whatsapp: boolean;
      googleSheets: boolean;
      staffInvited: boolean;
    };
  };
}

export class ConfigurationStatusService {
  /**
   * Get complete configuration status for an organization
   */
  async getStatus(organizationId: string): Promise<ConfigurationStatus> {
    // Fetch organization
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    // Get staff invitation statistics
    const [pending, accepted, expired, total] = await Promise.all([
      prisma.staffInvitation.count({
        where: {
          organizationId,
          status: 'PENDING',
        },
      }),
      prisma.staffInvitation.count({
        where: {
          organizationId,
          status: 'ACCEPTED',
        },
      }),
      prisma.staffInvitation.count({
        where: {
          organizationId,
          status: 'EXPIRED',
        },
      }),
      prisma.staffInvitation.count({
        where: {
          organizationId,
        },
      }),
    ]);

    // Calculate setup progress
    const steps = {
      whatsapp: organization.whatsappConfigured,
      googleSheets: organization.googleSheetsSyncEnabled,
      staffInvited: accepted > 0 || pending > 0,
    };

    const completedSteps = Object.values(steps).filter(Boolean).length;
    const overall = Math.round((completedSteps / 3) * 100);

    // Build whatsapp status with proper optional handling
    const whatsappStatus: ConfigurationStatus['whatsapp'] = {
      configured: organization.whatsappConfigured,
      phoneVerified: organization.whatsappPhoneVerified,
      lastUpdated: organization.updatedAt,
    };
    if (organization.whatsappPhoneNumber) {
      whatsappStatus.phoneNumber = organization.whatsappPhoneNumber;
    }

    // Build google sheets status with proper optional handling
    const googleSheetsStatus: ConfigurationStatus['googleSheets'] = {
      configured: organization.googleSheetsSyncEnabled,
      syncEnabled: organization.googleSheetsSyncEnabled,
    };
    if (organization.googleSheetsId) {
      googleSheetsStatus.sheetsId = organization.googleSheetsId;
    }

    return {
      whatsapp: whatsappStatus,
      googleSheets: googleSheetsStatus,
      staffInvitations: {
        total,
        pending,
        accepted,
        expired,
      },
      setupProgress: {
        overall,
        steps,
      },
    };
  }

  /**
   * Update WhatsApp configuration status
   */
  async updateWhatsAppStatus(
    organizationId: string,
    data: {
      phoneNumber?: string;
      phoneVerified?: boolean;
      configured?: boolean;
    }
  ): Promise<void> {
    // Build update data object only with provided fields
    const updateData: any = {};
    if (data.phoneNumber !== undefined) {
      updateData.whatsappPhoneNumber = data.phoneNumber;
    }
    if (data.phoneVerified !== undefined) {
      updateData.whatsappPhoneVerified = data.phoneVerified;
    }
    if (data.configured !== undefined) {
      updateData.whatsappConfigured = data.configured;
    }

    await prisma.organization.update({
      where: { id: organizationId },
      data: updateData,
    });
  }

  /**
   * Update Google Sheets configuration status
   */
  async updateGoogleSheetsStatus(
    organizationId: string,
    data: {
      sheetsId?: string;
      syncEnabled?: boolean;
    }
  ): Promise<void> {
    // Build update data object only with provided fields
    const updateData: any = {};
    if (data.sheetsId !== undefined) {
      updateData.googleSheetsId = data.sheetsId;
    }
    if (data.syncEnabled !== undefined) {
      updateData.googleSheetsSyncEnabled = data.syncEnabled;
    }

    await prisma.organization.update({
      where: { id: organizationId },
      data: updateData,
    });
  }

  /**
   * Check if organization setup is complete
   */
  async isSetupComplete(organizationId: string): Promise<boolean> {
    const status = await this.getStatus(organizationId);
    return status.setupProgress.overall === 100;
  }

  /**
   * Get next recommended setup step
   */
  async getNextSetupStep(organizationId: string): Promise<string | null> {
    const status = await this.getStatus(organizationId);
    const { steps } = status.setupProgress;

    if (!steps.whatsapp) {
      return 'whatsapp';
    }
    if (!steps.googleSheets) {
      return 'googleSheets';
    }
    if (!steps.staffInvited) {
      return 'staffInvitations';
    }

    return null; // All steps complete
  }
}

// Export singleton instance
export const configurationStatusService = new ConfigurationStatusService();
