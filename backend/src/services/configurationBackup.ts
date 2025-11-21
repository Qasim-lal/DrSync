/**
 * Configuration Backup and Recovery Service
 * TASK-036D-002: Configuration Backup and Recovery
 * 
 * Provides functionality to:
 * - Backup organization configurations
 * - Restore configurations from backups
 * - Validate backup integrity
 * - Export/import configuration data
 */

import { getPrismaClient } from './prisma';
import { Organization, User, StaffInvitation } from '@prisma/client';
import { z } from 'zod';
import * as crypto from 'crypto';

const prisma = getPrismaClient();

// Backup data structure
export interface ConfigurationBackup {
  version: string;
  timestamp: Date;
  organizationId: string;
  checksum: string;
  data: {
    organization: Partial<Organization>;
    users: Partial<User>[];
    invitations: Partial<StaffInvitation>[];
    settings: Record<string, any>;
  };
}

// Validation schema
const BackupSchema = z.object({
  version: z.string(),
  timestamp: z.date(),
  organizationId: z.string().min(1), // Accept any non-empty string (cuid or uuid)
  checksum: z.string(),
  data: z.object({
    organization: z.record(z.any()),
    users: z.array(z.record(z.any())),
    invitations: z.array(z.record(z.any())),
    settings: z.record(z.any()),
  }),
});

export class ConfigurationBackupService {
  private readonly BACKUP_VERSION = '1.0.0';

  /**
   * Creates a complete backup of organization configuration
   */
  async createBackup(organizationId: string): Promise<ConfigurationBackup> {
    // Fetch organization data
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    // Fetch related users (excluding sensitive data)
    const users = await prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        emailVerified: true,
        phone: true,
        createdAt: true,
      },
    });

    // Fetch staff invitations
    const invitations = await prisma.staffInvitation.findMany({
      where: { organizationId },
    });

    // Collect settings (placeholder for future configuration tables)
    const settings = {
      whatsappConfigured: false, // Would check WhatsAppConfig table
      googleSheetsConfigured: false, // Would check GoogleSheetsConfig table
    };

    // Create backup object
    const backup: ConfigurationBackup = {
      version: this.BACKUP_VERSION,
      timestamp: new Date(),
      organizationId,
      checksum: '', // Will be calculated
      data: {
        organization: this.sanitizeOrganization(organization),
        users: users.map((u) => this.sanitizeUser(u)),
        invitations: invitations.map((i) => this.sanitizeInvitation(i)),
        settings,
      },
    };

    // Calculate checksum
    backup.checksum = this.calculateChecksum(backup);

    return backup;
  }

  /**
   * Validates a backup's integrity
   */
  validateBackup(backup: ConfigurationBackup): boolean {
    try {
      // Validate schema
      BackupSchema.parse(backup);

      // Verify checksum
      const calculatedChecksum = this.calculateChecksum({
        ...backup,
        checksum: '',
      });

      if (calculatedChecksum !== backup.checksum) {
        throw new Error('Checksum mismatch - backup may be corrupted');
      }

      // Verify version compatibility
      if (backup.version !== this.BACKUP_VERSION) {
        throw new Error(`Incompatible backup version: ${backup.version}`);
      }

      return true;
    } catch (error: any) {
      throw new Error(`Backup validation failed: ${error.message}`);
    }
  }

  /**
   * Restores configuration from a backup
   */
  async restoreBackup(
    backup: ConfigurationBackup,
    options: {
      restoreUsers?: boolean;
      restoreInvitations?: boolean;
      overwriteExisting?: boolean;
    } = {}
  ): Promise<void> {
    // Validate backup first
    this.validateBackup(backup);

    const {
      restoreUsers = true,
      restoreInvitations = true,
      overwriteExisting = false,
    } = options;

    // Check if organization exists
    const existingOrg = await prisma.organization.findUnique({
      where: { id: backup.organizationId },
    });

    if (!existingOrg) {
      throw new Error('Target organization not found');
    }

    // Use transaction for atomic restore
    await prisma.$transaction(async (tx) => {
      // Restore organization settings
      if (overwriteExisting) {
        await tx.organization.update({
          where: { id: backup.organizationId },
          data: {
            name: backup.data.organization.name as string,
            email: backup.data.organization.email as string,
            phone: backup.data.organization.phone as string,
            address: backup.data.organization.address as string,
          },
        });
      }

      // Restore users if requested
      if (restoreUsers && backup.data.users.length > 0) {
        for (const userData of backup.data.users) {
          const existingUser = await tx.user.findFirst({
            where: {
              email: userData.email as string,
              organizationId: backup.organizationId,
            },
          });

          if (!existingUser || overwriteExisting) {
            // Skip user creation/update as passwords cannot be restored
            // This is a security feature - users must be invited
            console.log(`Skipping user restore for: ${userData.email}`);
          }
        }
      }

      // Restore invitations if requested
      if (restoreInvitations && backup.data.invitations.length > 0) {
        for (const invitationData of backup.data.invitations) {
          const existingInvitation = await tx.staffInvitation.findFirst({
            where: {
              email: invitationData.email as string,
              organizationId: backup.organizationId,
            },
          });

          if (!existingInvitation) {
            // Re-create pending invitations only
            if (invitationData.status === 'PENDING') {
              // Need to get invitedBy from the backup data
              const invitedByValue = (invitationData as any).invitedBy;
              if (invitedByValue) {
                await tx.staffInvitation.create({
                  data: {
                    email: invitationData.email as string,
                    firstName: (invitationData as any).firstName || 'Invited',
                    lastName: (invitationData as any).lastName || 'User',
                    role: invitationData.role as any,
                    permissions: (invitationData as any).permissions || [],
                    token: crypto.randomBytes(32).toString('hex'),
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    organizationId: backup.organizationId,
                    invitedBy: invitedByValue,
                  },
                });
              }
            }
          }
        }
      }
    });
  }

  /**
   * Exports backup to JSON string
   */
  exportBackup(backup: ConfigurationBackup): string {
    return JSON.stringify(backup, null, 2);
  }

  /**
   * Imports backup from JSON string
   */
  importBackup(jsonString: string): ConfigurationBackup {
    try {
      const parsed = JSON.parse(jsonString);

      // Convert timestamp string back to Date
      parsed.timestamp = new Date(parsed.timestamp);

      return parsed as ConfigurationBackup;
    } catch (error: any) {
      throw new Error(`Failed to import backup: ${error.message}`);
    }
  }

  /**
   * Lists available backups for an organization
   */
  async listBackups(_organizationId: string): Promise<ConfigurationBackup[]> {
    // In a real implementation, this would fetch from a backup storage
    // For now, return empty array as backups are not persisted
    return [];
  }

  /**
   * Compares two backups and returns differences
   */
  compareBackups(
    backup1: ConfigurationBackup,
    backup2: ConfigurationBackup
  ): {
    usersAdded: number;
    usersRemoved: number;
    invitationsAdded: number;
    invitationsRemoved: number;
    settingsChanged: string[];
  } {
    const users1 = new Set(backup1.data.users.map((u) => u.email));
    const users2 = new Set(backup2.data.users.map((u) => u.email));

    const invitations1 = new Set(backup1.data.invitations.map((i) => i.email));
    const invitations2 = new Set(backup2.data.invitations.map((i) => i.email));

    const usersAdded = [...users2].filter((u) => !users1.has(u)).length;
    const usersRemoved = [...users1].filter((u) => !users2.has(u)).length;

    const invitationsAdded = [...invitations2].filter(
      (i) => !invitations1.has(i)
    ).length;
    const invitationsRemoved = [...invitations1].filter(
      (i) => !invitations2.has(i)
    ).length;

    const settingsChanged: string[] = [];
    for (const key of Object.keys(backup1.data.settings)) {
      if (
        backup1.data.settings[key] !== backup2.data.settings[key]
      ) {
        settingsChanged.push(key);
      }
    }

    return {
      usersAdded,
      usersRemoved,
      invitationsAdded,
      invitationsRemoved,
      settingsChanged,
    };
  }

  /**
   * Creates a differential backup (only changes since last backup)
   */
  async createDifferentialBackup(
    organizationId: string,
    _baseBackup: ConfigurationBackup
  ): Promise<ConfigurationBackup> {
    const currentBackup = await this.createBackup(organizationId);

    // For now, return full backup
    // In a real implementation, would compute diff
    return currentBackup;
  }

  // Private helper methods

  private sanitizeOrganization(org: Organization): Partial<Organization> {
    const { id, name, email, phone, address, slug, organizationType } = org;
    return { id, name, email, phone, address, slug, organizationType };
  }

  private sanitizeUser(user: any): Partial<User> {
    // Exclude password and sensitive fields
    const { password, ...safeUser } = user;
    return safeUser;
  }

  private sanitizeInvitation(
    invitation: StaffInvitation
  ): Partial<StaffInvitation> {
    // Exclude token (will be regenerated on restore)
    const { token, ...safeInvitation } = invitation;
    return safeInvitation;
  }

  private calculateChecksum(backup: ConfigurationBackup): string {
    // Create a deterministic string representation
    const dataString = JSON.stringify({
      version: backup.version,
      timestamp: backup.timestamp.toISOString(),
      organizationId: backup.organizationId,
      data: backup.data,
    });

    // Calculate SHA-256 hash
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }
}

// Export singleton instance
export const configurationBackupService = new ConfigurationBackupService();
