/**
 * Configuration Backup and Recovery Tests
 * TASK-036D-002: Configuration Backup and Recovery Testing
 */

import { configurationBackupService, ConfigurationBackup } from '../src/services/configurationBackup';
import { getPrismaClient } from '../src/services/prisma';
import { SubscriptionPlan, SubscriptionStatus, UserRole, OrganizationType } from '../src/generated/prisma';

const prisma = getPrismaClient();

describe('TASK-036D-002: Configuration Backup and Recovery', () => {
  let organizationId: string;
  let userId: string;

  beforeAll(async () => {
    // Create test organization
    const organization = await prisma.organization.create({
      data: {
        name: 'Backup Test Clinic',
        email: 'backup-test-' + Date.now() + '@clinic.com',
        phone: '+923001111111',
        address: 'Test Address',
        slug: 'backup-test-clinic-' + Date.now(),
        organizationType: OrganizationType.CLINIC,
        subscriptionPlan: SubscriptionPlan.FREE,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
      },
    });
    organizationId = organization.id;

    // Create test user
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);

    const user = await prisma.user.create({
      data: {
        email: 'backup-user-' + Date.now() + '@clinic.com',
        password: hashedPassword,
        firstName: 'Backup',
        lastName: 'User',
        role: UserRole.ADMIN,
        organizationId: organization.id,
        emailVerified: true,
        isActive: true,
      },
    });
    userId = user.id;

    // Create test invitation
    await prisma.staffInvitation.create({
      data: {
        email: 'backup-invite-' + Date.now() + '@example.com',
        role: UserRole.DOCTOR,
        token: 'test-token-' + Date.now(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        organizationId: organization.id,
        invitedBy: user.id,
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.staffInvitation.deleteMany({ where: { organizationId } });
    await prisma.user.deleteMany({ where: { organizationId } });
    await prisma.organization.delete({ where: { id: organizationId } });
    await prisma.$disconnect();
  });

  describe('Backup Creation', () => {
    it('should create a complete backup', async () => {
      const backup = await configurationBackupService.createBackup(organizationId);

      expect(backup).toBeDefined();
      expect(backup.version).toBe('1.0.0');
      expect(backup.organizationId).toBe(organizationId);
      expect(backup.checksum).toBeDefined();
      expect(backup.timestamp).toBeInstanceOf(Date);

      expect(backup.data.organization).toBeDefined();
      expect(backup.data.users.length).toBeGreaterThan(0);
      expect(backup.data.invitations.length).toBeGreaterThan(0);
      expect(backup.data.settings).toBeDefined();
    });

    it('should exclude sensitive data from backup', async () => {
      const backup = await configurationBackupService.createBackup(organizationId);

      // Users should not contain passwords
      backup.data.users.forEach((user) => {
        expect(user).not.toHaveProperty('password');
      });

      // Invitations should not contain tokens
      backup.data.invitations.forEach((invitation) => {
        expect(invitation).not.toHaveProperty('token');
      });
    });

    it('should generate unique checksums for different backups', async () => {
      const backup1 = await configurationBackupService.createBackup(organizationId);

      // Wait a moment to ensure timestamp differs
      await new Promise((resolve) => setTimeout(resolve, 100));

      const backup2 = await configurationBackupService.createBackup(organizationId);

      // Checksums should be different due to different timestamps
      expect(backup1.checksum).not.toBe(backup2.checksum);
    });

    it('should fail to create backup for non-existent organization', async () => {
      await expect(
        configurationBackupService.createBackup('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow('Organization not found');
    });
  });

  describe('Backup Validation', () => {
    let validBackup: ConfigurationBackup;

    beforeAll(async () => {
      validBackup = await configurationBackupService.createBackup(organizationId);
    });

    it('should validate a valid backup', () => {
      const result = configurationBackupService.validateBackup(validBackup);
      expect(result).toBe(true);
    });

    it('should reject backup with invalid checksum', () => {
      const corruptedBackup = {
        ...validBackup,
        checksum: 'invalid-checksum',
      };

      expect(() => configurationBackupService.validateBackup(corruptedBackup)).toThrow(
        'Checksum mismatch'
      );
    });

    it('should reject backup with incompatible version', () => {
      const incompatibleBackup = {
        ...validBackup,
        version: '2.0.0',
        checksum: '', // Will be recalculated
      };

      // Recalculate checksum for the modified backup
      incompatibleBackup.checksum = (configurationBackupService as any).calculateChecksum(
        incompatibleBackup
      );

      expect(() => configurationBackupService.validateBackup(incompatibleBackup)).toThrow(
        'Incompatible backup version'
      );
    });

    it('should reject backup with tampered data', () => {
      const tamperedBackup = {
        ...validBackup,
        data: {
          ...validBackup.data,
          organization: {
            ...validBackup.data.organization,
            name: 'Tampered Name',
          },
        },
      };

      expect(() => configurationBackupService.validateBackup(tamperedBackup)).toThrow(
        'Checksum mismatch'
      );
    });

    it('should reject backup with invalid schema', () => {
      const invalidBackup = {
        ...validBackup,
        organizationId: 'not-a-uuid',
      };

      expect(() => configurationBackupService.validateBackup(invalidBackup as any)).toThrow(
        'Backup validation failed'
      );
    });
  });

  describe('Backup Export and Import', () => {
    let backup: ConfigurationBackup;

    beforeAll(async () => {
      backup = await configurationBackupService.createBackup(organizationId);
    });

    it('should export backup to JSON string', () => {
      const jsonString = configurationBackupService.exportBackup(backup);

      expect(typeof jsonString).toBe('string');
      expect(jsonString.length).toBeGreaterThan(0);

      // Verify it's valid JSON
      const parsed = JSON.parse(jsonString);
      expect(parsed.version).toBe(backup.version);
      expect(parsed.organizationId).toBe(backup.organizationId);
    });

    it('should import backup from JSON string', () => {
      const jsonString = configurationBackupService.exportBackup(backup);
      const imported = configurationBackupService.importBackup(jsonString);

      expect(imported.version).toBe(backup.version);
      expect(imported.organizationId).toBe(backup.organizationId);
      expect(imported.checksum).toBe(backup.checksum);
      expect(imported.timestamp).toBeInstanceOf(Date);
    });

    it('should handle export-import roundtrip', () => {
      const jsonString = configurationBackupService.exportBackup(backup);
      const imported = configurationBackupService.importBackup(jsonString);

      // Validate imported backup
      const result = configurationBackupService.validateBackup(imported);
      expect(result).toBe(true);
    });

    it('should reject invalid JSON during import', () => {
      expect(() => configurationBackupService.importBackup('invalid json')).toThrow(
        'Failed to import backup'
      );
    });
  });

  describe('Backup Restore', () => {
    let backup: ConfigurationBackup;

    beforeAll(async () => {
      backup = await configurationBackupService.createBackup(organizationId);
    });

    it('should restore backup successfully', async () => {
      await expect(
        configurationBackupService.restoreBackup(backup, {
          restoreUsers: false,
          restoreInvitations: true,
          overwriteExisting: false,
        })
      ).resolves.not.toThrow();
    });

    it('should validate backup before restoring', async () => {
      const corruptedBackup = {
        ...backup,
        checksum: 'invalid',
      };

      await expect(
        configurationBackupService.restoreBackup(corruptedBackup)
      ).rejects.toThrow('Checksum mismatch');
    });

    it('should fail to restore to non-existent organization', async () => {
      const invalidBackup = {
        ...backup,
        organizationId: '00000000-0000-0000-0000-000000000000',
      };

      // Recalculate checksum for the new organizationId
      invalidBackup.checksum = (configurationBackupService as any).calculateChecksum(
        invalidBackup
      );

      await expect(
        configurationBackupService.restoreBackup(invalidBackup)
      ).rejects.toThrow('Target organization not found');
    });

    it('should handle restore with no invitations', async () => {
      const emptyBackup = {
        ...backup,
        data: {
          ...backup.data,
          invitations: [],
        },
      };

      // Recalculate checksum
      emptyBackup.checksum = (configurationBackupService as any).calculateChecksum(emptyBackup);

      await expect(
        configurationBackupService.restoreBackup(emptyBackup, {
          restoreInvitations: true,
        })
      ).resolves.not.toThrow();
    });
  });

  describe('Backup Comparison', () => {
    let backup1: ConfigurationBackup;
    let backup2: ConfigurationBackup;

    beforeAll(async () => {
      backup1 = await configurationBackupService.createBackup(organizationId);

      // Create a new user to change the state
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('TestPassword123!', 10);

      await prisma.user.create({
        data: {
          email: 'backup-compare-' + Date.now() + '@clinic.com',
          password: hashedPassword,
          firstName: 'Compare',
          lastName: 'User',
          role: UserRole.DOCTOR,
          organizationId,
          emailVerified: true,
          isActive: true,
        },
      });

      backup2 = await configurationBackupService.createBackup(organizationId);
    });

    it('should compare two backups', () => {
      const diff = configurationBackupService.compareBackups(backup1, backup2);

      expect(diff).toBeDefined();
      expect(diff.usersAdded).toBeGreaterThanOrEqual(0);
      expect(diff.usersRemoved).toBeGreaterThanOrEqual(0);
      expect(diff.invitationsAdded).toBeGreaterThanOrEqual(0);
      expect(diff.invitationsRemoved).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(diff.settingsChanged)).toBe(true);
    });

    it('should detect added users', () => {
      const diff = configurationBackupService.compareBackups(backup1, backup2);
      expect(diff.usersAdded).toBe(1);
    });

    it('should detect no changes in identical backups', () => {
      const diff = configurationBackupService.compareBackups(backup1, backup1);

      expect(diff.usersAdded).toBe(0);
      expect(diff.usersRemoved).toBe(0);
      expect(diff.invitationsAdded).toBe(0);
      expect(diff.invitationsRemoved).toBe(0);
      expect(diff.settingsChanged.length).toBe(0);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle backup creation within acceptable time', async () => {
      const startTime = Date.now();
      await configurationBackupService.createBackup(organizationId);
      const duration = Date.now() - startTime;

      // Backup should complete within 2 seconds
      expect(duration).toBeLessThan(2000);
    });

    it('should handle large organizations', async () => {
      // Create multiple invitations to simulate larger data
      for (let i = 0; i < 10; i++) {
        await prisma.staffInvitation.create({
          data: {
            email: `large-org-${i}-${Date.now()}@example.com`,
            role: UserRole.STAFF,
            token: `token-${i}-${Date.now()}`,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            organizationId,
            invitedBy: userId,
          },
        });
      }

      const backup = await configurationBackupService.createBackup(organizationId);

      expect(backup.data.invitations.length).toBeGreaterThanOrEqual(10);
      expect(configurationBackupService.validateBackup(backup)).toBe(true);
    });

    it('should handle empty organizations', async () => {
      // Create organization with no users or invitations
      const emptyOrg = await prisma.organization.create({
        data: {
          name: 'Empty Org',
          email: 'empty-' + Date.now() + '@clinic.com',
          phone: '+923002222222',
          address: 'Empty Address',
          slug: 'empty-org-' + Date.now(),
          organizationType: OrganizationType.CLINIC,
          subscriptionPlan: SubscriptionPlan.FREE,
          subscriptionStatus: SubscriptionStatus.ACTIVE,
        },
      });

      const backup = await configurationBackupService.createBackup(emptyOrg.id);

      expect(backup.data.users.length).toBe(0);
      expect(backup.data.invitations.length).toBe(0);
      expect(configurationBackupService.validateBackup(backup)).toBe(true);

      // Cleanup
      await prisma.organization.delete({ where: { id: emptyOrg.id } });
    });

    it('should create differential backup', async () => {
      const baseBackup = await configurationBackupService.createBackup(organizationId);

      const diffBackup = await configurationBackupService.createDifferentialBackup(
        organizationId,
        baseBackup
      );

      expect(diffBackup).toBeDefined();
      expect(diffBackup.organizationId).toBe(organizationId);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent backup creation', async () => {
      const promises = Array.from({ length: 5 }, () =>
        configurationBackupService.createBackup(organizationId)
      );

      const backups = await Promise.all(promises);

      backups.forEach((backup) => {
        expect(backup).toBeDefined();
        expect(configurationBackupService.validateBackup(backup)).toBe(true);
      });
    });

    it('should handle concurrent validation', async () => {
      const backup = await configurationBackupService.createBackup(organizationId);

      const validations = Array.from({ length: 10 }, () =>
        configurationBackupService.validateBackup(backup)
      );

      validations.forEach((result) => {
        expect(result).toBe(true);
      });
    });
  });
});
