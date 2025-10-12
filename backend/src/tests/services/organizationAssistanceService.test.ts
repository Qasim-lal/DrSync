/**
 * Organization Assistance Service Tests - SUBTASK-038D-002
 * 
 * Tests for all 5 subtasks:
 * - 038D-002-1: Setup Assistance Dashboard
 * - 038D-002-2: Configuration Troubleshooting
 * - 038D-002-3: Billing Issue Resolution
 * - 038D-002-4: Password Reset Assistance
 * - 038D-002-5: Data Correction Tools
 */

// Mock Prisma client before importing the service
jest.mock('../../services/prisma', () => {
  const mockPrisma = {
    organization: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    appointment: {
      count: jest.fn(),
    },
  };
  
  return {
    getPrismaClient: jest.fn(() => mockPrisma),
    __mockPrisma: mockPrisma,
  };
});

import { organizationAssistanceService } from '../../services/organizationAssistanceService';
const { __mockPrisma: mockPrisma } = jest.requireMock('../../services/prisma');

describe('OrganizationAssistanceService - SUBTASK-038D-002', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // SUBTASK-038D-002-1: Setup Assistance Dashboard
  // ============================================================================
  
  describe('038D-002-1: Setup Assistance Dashboard', () => {
    
    describe('getSetupProgress', () => {
      it('should calculate setup progress for incomplete organization', async () => {
        const mockOrg = {
          id: 'org-123',
          name: 'Test Clinic',
          email: 'test@clinic.com',
          phone: '+923001234567',
          whatsappPhoneNumber: null,
          whatsappBusinessId: null,
          googleSheetsId: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
          users: [
            { id: 'user-1', email: 'admin@clinic.com', role: 'ORG_ADMIN', createdAt: new Date() }
          ]
        };

        mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);
        mockPrisma.appointment.count.mockResolvedValue(0);

        const result = await organizationAssistanceService.getSetupProgress('org-123');

        expect(result).toMatchObject({
          organizationId: 'org-123',
          organizationName: 'Test Clinic',
          wizardComplete: false,
          completionPercentage: 20, // 1 out of 5 steps complete (only accountSetup)
        });

        expect(result.steps).toEqual({
          accountSetup: true,
          whatsappConfig: false,
          googleSheetsIntegration: false,
          providerSetup: false,
          firstAppointment: false
        });

        expect(result.blockers).toContain('WhatsApp not configured');
        expect(result.blockers).toContain('Google Sheets not connected');
        expect(result.recommendations).toContain('Help configure WhatsApp Business API');
      });

      it('should show 100% completion for fully setup organization', async () => {
        const mockOrg = {
          id: 'org-456',
          name: 'Complete Clinic',
          email: 'complete@clinic.com',
          phone: '+923001234567',
          whatsappPhoneNumber: '+923001234567',
          whatsappBusinessId: 'wa-business-123',
          googleSheetsId: 'sheet-123',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
          users: [
            { id: 'user-1', email: 'doctor@clinic.com', role: 'DOCTOR', createdAt: new Date() }
          ]
        };

        mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);
        mockPrisma.appointment.count.mockResolvedValue(5);

        const result = await organizationAssistanceService.getSetupProgress('org-456');

        expect(result.completionPercentage).toBe(100);
        expect(result.wizardComplete).toBe(true);
        expect(result.blockers).toHaveLength(0);
        expect(result.steps.whatsappConfig).toBe(true);
        expect(result.steps.googleSheetsIntegration).toBe(true);
      });

      it('should throw error for non-existent organization', async () => {
        mockPrisma.organization.findUnique.mockResolvedValue(null);

        await expect(
          organizationAssistanceService.getSetupProgress('non-existent')
        ).rejects.toThrow('Failed to get setup progress');
      });
    });

    describe('sendSetupReminder', () => {
      it('should send reminder for incomplete setup', async () => {
        const mockOrg = {
          id: 'org-123',
          name: 'Test Clinic',
          email: 'test@clinic.com',
          users: [
            { email: 'admin@clinic.com', firstName: 'Admin', lastName: 'User' }
          ]
        };

        mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

        const result = await organizationAssistanceService.sendSetupReminder(
          'org-123',
          'INCOMPLETE_SETUP'
        );

        expect(result).toMatchObject({
          success: true,
          sentTo: 'admin@clinic.com',
          reminderType: 'INCOMPLETE_SETUP'
        });
        expect(result.sentAt).toBeInstanceOf(Date);
      });

      it('should send WhatsApp configuration reminder', async () => {
        const mockOrg = {
          id: 'org-123',
          email: 'test@clinic.com',
          users: []
        };

        mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

        const result = await organizationAssistanceService.sendSetupReminder(
          'org-123',
          'WHATSAPP_CONFIG'
        );

        expect(result.reminderType).toBe('WHATSAPP_CONFIG');
        expect(result.sentTo).toBe('test@clinic.com'); // Fallback to org email
      });
    });
  });

  // ============================================================================
  // SUBTASK-038D-002-2: Configuration Troubleshooting
  // ============================================================================
  
  describe('038D-002-2: Configuration Troubleshooting', () => {
    
    describe('testWhatsAppConfig', () => {
      it('should detect incomplete WhatsApp configuration', async () => {
        const mockOrg = {
          id: 'org-123',
          whatsappPhoneNumber: null,
          whatsappBusinessId: null,
          whatsappConfigured: false
        };

        mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

        const result = await organizationAssistanceService.testWhatsAppConfig('org-123');

        expect(result.configured).toBe(false);
        expect(result.hasPhoneNumber).toBe(false);
        expect(result.hasBusinessId).toBe(false);
        expect(result.errors).toContain('WhatsApp phone number not configured');
        expect(result.recommendations).toContain('Add WhatsApp Business phone number in settings');
        expect(result.connectionStatus).toBe('FAILED');
      });

      it('should verify complete WhatsApp configuration', async () => {
        const mockOrg = {
          id: 'org-123',
          whatsappPhoneNumber: '+923001234567',
          whatsappBusinessId: 'wa-business-123',
          whatsappConfigured: true,
          whatsappCredentials: null, // Not sending test message
          phone: '+923001234567'
        };

        mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

        const result = await organizationAssistanceService.testWhatsAppConfig('org-123', false);

        expect(result.configured).toBe(true);
        expect(result.hasPhoneNumber).toBe(true);
        expect(result.hasBusinessId).toBe(true);
        expect(result.connectionStatus).toBe('SUCCESS');
        expect(result.testMessageSent).toBe(false); // Not requested
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('testSheetsConnection', () => {
      it('should detect missing Google Sheets configuration', async () => {
        const mockOrg = {
          id: 'org-123',
          googleSheetsId: null,
          googleSheetsTokens: null
        };

        mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

        const result = await organizationAssistanceService.testSheetsConnection('org-123');

        expect(result.configured).toBe(false);
        expect(result.hasSheetId).toBe(false);
        expect(result.hasTokens).toBe(false);
        expect(result.errors).toContain('Google Sheet ID not configured');
        expect(result.errors).toContain('Google OAuth tokens not found');
        expect(result.connectionStatus).toBe('FAILED');
      });

      it('should verify complete Google Sheets configuration', async () => {
        const mockOrg = {
          id: 'org-123',
          googleSheetsId: 'sheet-123',
          googleSheetsTokens: { access_token: 'token', refresh_token: 'refresh' }
        };

        mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

        const result = await organizationAssistanceService.testSheetsConnection('org-123', false);

        expect(result.configured).toBe(true);
        expect(result.connectionStatus).toBe('SUCCESS');
        expect(result.canReadSheet).toBe(true);
        expect(result.canWriteSheet).toBe(true);
        expect(result.syncTriggered).toBe(false); // Not requested
      });
    });

    describe('runDiagnostics', () => {
      it('should identify all issues in unhealthy organization', async () => {
        const mockOrg = {
          id: 'org-123',
          email: null,
          phone: null,
          whatsappPhoneNumber: null,
          whatsappBusinessId: null,
          googleSheetsId: null,
          subscriptionStatus: 'SUSPENDED',
          users: []
        };

        mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

        const result = await organizationAssistanceService.runDiagnostics('org-123');

        expect(result.overallStatus).toBe('CRITICAL');
        expect(result.checks.accountInfo.status).toBe('FAIL');
        expect(result.checks.whatsappIntegration.status).toBe('FAIL');
        expect(result.checks.sheetsIntegration.status).toBe('FAIL');
        expect(result.checks.users.status).toBe('FAIL');
        expect(result.checks.subscriptionStatus.status).toBe('FAIL');
        expect(result.criticalIssues.length).toBeGreaterThan(0);
      });

      it('should show healthy status for properly configured organization', async () => {
        const mockOrg = {
          id: 'org-123',
          email: 'test@clinic.com',
          phone: '+923001234567',
          whatsappPhoneNumber: '+923001234567',
          whatsappBusinessId: 'wa-123',
          googleSheetsId: 'sheet-123',
          subscriptionStatus: 'ACTIVE',
          users: [
            { id: 'user-1', email: 'user@clinic.com', role: 'DOCTOR' }
          ]
        };

        mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

        const result = await organizationAssistanceService.runDiagnostics('org-123');

        expect(result.overallStatus).toBe('HEALTHY');
        expect(result.criticalIssues).toHaveLength(0);
        expect(result.issuesFound).toHaveLength(0);
      });
    });

    describe('applyCommonFixes', () => {
      it('should apply RESET_TOKENS fix', async () => {
        const result = await organizationAssistanceService.applyCommonFixes(
          'org-123',
          'RESET_TOKENS'
        );

        expect(result.fixType).toBe('RESET_TOKENS');
        expect(result.applied).toBe(true);
        expect(result.requiresManualIntervention).toBe(true);
      });

      it('should apply CLEAR_CACHE fix', async () => {
        const result = await organizationAssistanceService.applyCommonFixes(
          'org-123',
          'CLEAR_CACHE'
        );

        expect(result.fixType).toBe('CLEAR_CACHE');
        expect(result.applied).toBe(true);
        expect(result.requiresManualIntervention).toBe(false);
      });

      it('should handle REAUTHORIZE_INTEGRATIONS', async () => {
        const result = await organizationAssistanceService.applyCommonFixes(
          'org-123',
          'REAUTHORIZE_INTEGRATIONS'
        );

        expect(result.fixType).toBe('REAUTHORIZE_INTEGRATIONS');
        expect(result.applied).toBe(false);
        expect(result.requiresManualIntervention).toBe(true);
      });
    });
  });

  // ============================================================================
  // SUBTASK-038D-002-3: Billing Issue Resolution
  // ============================================================================
  
  describe('038D-002-3: Billing Issue Resolution', () => {
    
    describe('retryFailedPayment', () => {
      it('should retry payment for organization with payment method', async () => {
        const mockOrg = {
          id: 'org-123',
          name: 'Test Clinic',
          paymentMethod: 'JAZZCASH',
          subscriptionStatus: 'PAST_DUE'
        };

        mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

        const result = await organizationAssistanceService.retryFailedPayment('org-123');

        expect(result.success).toBe(true);
        expect(result.organizationId).toBe('org-123');
        expect(result.paymentRetried).toBe(true);
        expect(result.paymentStatus).toBe('PROCESSING');
      });

      it('should throw error when no payment method configured', async () => {
        const mockOrg = {
          id: 'org-123',
          name: 'Test Clinic',
          paymentMethod: null,
          subscriptionStatus: 'PAST_DUE'
        };

        mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

        await expect(
          organizationAssistanceService.retryFailedPayment('org-123')
        ).rejects.toThrow('Failed to retry payment');
      });
    });

    describe('applyCredit', () => {
      it('should apply credit to organization account', async () => {
        const mockOrg = {
          id: 'org-123',
          name: 'Test Clinic'
        };

        mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

        const result = await organizationAssistanceService.applyCredit(
          'org-123',
          100,
          'Compensation for service disruption',
          'admin-123'
        );

        expect(result.success).toBe(true);
        expect(result.creditAmount).toBe(100);
        expect(result.reason).toBe('Compensation for service disruption');
        expect(result.appliedBy).toBe('admin-123');
      });

      it('should reject negative credit amount', async () => {
        const mockOrg = {
          id: 'org-123',
          name: 'Test Clinic'
        };

        mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

        await expect(
          organizationAssistanceService.applyCredit('org-123', -50, 'Test', 'admin-123')
        ).rejects.toThrow('Failed to apply credit');
      });

      it('should reject zero credit amount', async () => {
        const mockOrg = {
          id: 'org-123',
          name: 'Test Clinic'
        };

        mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

        await expect(
          organizationAssistanceService.applyCredit('org-123', 0, 'Test', 'admin-123')
        ).rejects.toThrow('Failed to apply credit');
      });
    });

    describe('updatePaymentMethod', () => {
      it('should update payment method for organization', async () => {
        const mockOrg = {
          id: 'org-123',
          name: 'Test Clinic',
          paymentMethod: 'JAZZCASH'
        };

        mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

        const result = await organizationAssistanceService.updatePaymentMethod(
          'org-123',
          'EASYPAISA'
        );

        expect(result.success).toBe(true);
        expect(result.paymentMethodUpdated).toBe(true);
        expect(result.newPaymentMethod).toBe('EASYPAISA');
      });
    });
  });

  // ============================================================================
  // SUBTASK-038D-002-4: Password Reset Assistance
  // ============================================================================
  
  describe('038D-002-4: Password Reset Assistance', () => {
    
    describe('forcePasswordReset', () => {
      it('should force password reset for locked user', async () => {
        const mockUser = {
          id: 'user-123',
          email: 'user@clinic.com',
          firstName: 'John',
          lastName: 'Doe',
          organizationId: 'org-123'
        };

        mockPrisma.user.findUnique.mockResolvedValue(mockUser);

        const result = await organizationAssistanceService.forcePasswordReset(
          'user-123',
          'admin-456'
        );

        expect(result.success).toBe(true);
        expect(result.userId).toBe('user-123');
        expect(result.userEmail).toBe('user@clinic.com');
        expect(result.resetTokenSent).toBe(true);
        expect(result.requestedBy).toBe('admin-456');
        expect(result.resetToken).toBeDefined();
      });

      it('should throw error for non-existent user', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(null);

        await expect(
          organizationAssistanceService.forcePasswordReset('non-existent', 'admin-456')
        ).rejects.toThrow('Failed to force password reset');
      });
    });

    describe('disableMFA', () => {
      it('should disable MFA for user who lost access', async () => {
        const mockUser = {
          id: 'user-123',
          email: 'user@clinic.com',
          firstName: 'John',
          lastName: 'Doe'
        };

        mockPrisma.user.findUnique.mockResolvedValue(mockUser);

        const result = await organizationAssistanceService.disableMFA(
          'user-123',
          'admin-456',
          'User lost phone with authenticator'
        );

        expect(result.success).toBe(true);
        expect(result.mfaDisabled).toBe(true);
        expect(result.reason).toBe('User lost phone with authenticator');
        expect(result.requestedBy).toBe('admin-456');
      });
    });

    describe('verifyEmail', () => {
      it('should verify existing email without changes', async () => {
        const mockUser = {
          id: 'user-123',
          email: 'user@clinic.com',
          firstName: 'John',
          lastName: 'Doe'
        };

        mockPrisma.user.findUnique.mockResolvedValue(mockUser);

        const result = await organizationAssistanceService.verifyEmail('user-123');

        expect(result.success).toBe(true);
        expect(result.verified).toBe(true);
        expect(result.email).toBe('user@clinic.com');
      });

      it('should update and verify new email', async () => {
        const mockUser = {
          id: 'user-123',
          email: 'old@clinic.com',
          firstName: 'John',
          lastName: 'Doe'
        };

        mockPrisma.user.findUnique
          .mockResolvedValueOnce(mockUser) // First call for the user
          .mockResolvedValueOnce(null); // Second call to check if new email exists

        const result = await organizationAssistanceService.verifyEmail(
          'user-123',
          'new@clinic.com'
        );

        expect(result.success).toBe(true);
        expect(result.oldEmail).toBe('old@clinic.com');
        expect(result.newEmail).toBe('new@clinic.com');
        expect(result.verified).toBe(true);
      });

      it('should reject email already in use', async () => {
        const mockUser = {
          id: 'user-123',
          email: 'old@clinic.com',
          firstName: 'John',
          lastName: 'Doe'
        };

        const existingUser = {
          id: 'user-456',
          email: 'existing@clinic.com'
        };

        mockPrisma.user.findUnique
          .mockResolvedValueOnce(mockUser)
          .mockResolvedValueOnce(existingUser);

        await expect(
          organizationAssistanceService.verifyEmail('user-123', 'existing@clinic.com')
        ).rejects.toThrow('Failed to verify email');
      });
    });
  });

  // ============================================================================
  // SUBTASK-038D-002-5: Data Correction Tools
  // ============================================================================
  
  describe('038D-002-5: Data Correction Tools', () => {
    
    describe('validateOrganizationData', () => {
      it('should identify validation errors in organization data', async () => {
        const mockOrg = {
          id: 'org-123',
          name: '',
          email: null,
          phone: null,
          users: []
        };

        mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

        const result = await organizationAssistanceService.validateOrganizationData('org-123');

        expect(result.isValid).toBe(false);
        expect(result.issues.length).toBeGreaterThan(0);
        expect(result.issues.some(i => i.field === 'name')).toBe(true);
        expect(result.issues.some(i => i.field === 'email')).toBe(true);
        expect(result.issues.some(i => i.field === 'users')).toBe(true);
      });

      it('should validate correct organization data', async () => {
        const mockOrg = {
          id: 'org-123',
          name: 'Test Clinic',
          email: 'test@clinic.com',
          phone: '+923001234567',
          users: [
            { id: 'user-1', role: 'ORG_ADMIN' },
            { id: 'user-2', role: 'DOCTOR' }
          ]
        };

        mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

        const result = await organizationAssistanceService.validateOrganizationData('org-123');

        expect(result.isValid).toBe(true);
        expect(result.issues.filter(i => i.severity === 'ERROR')).toHaveLength(0);
      });

      it('should identify missing admin user', async () => {
        const mockOrg = {
          id: 'org-123',
          name: 'Test Clinic',
          email: 'test@clinic.com',
          phone: '+923001234567',
          users: [
            { id: 'user-1', role: 'DOCTOR' }
          ]
        };

        mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

        const result = await organizationAssistanceService.validateOrganizationData('org-123');

        expect(result.isValid).toBe(false);
        expect(result.issues.some(i => i.message === 'No admin user found')).toBe(true);
      });
    });

    describe('cleanupOrganizationData', () => {
      it('should cleanup duplicate records', async () => {
        const result = await organizationAssistanceService.cleanupOrganizationData(
          'org-123',
          'DUPLICATES'
        );

        expect(result.cleanupType).toBe('DUPLICATES');
        expect(result.itemsRemoved).toBeDefined();
        expect(result.summary).toBeDefined();
      });

      it('should cleanup test data', async () => {
        const result = await organizationAssistanceService.cleanupOrganizationData(
          'org-123',
          'TEST_DATA'
        );

        expect(result.cleanupType).toBe('TEST_DATA');
        expect(result.summary).toContain('Test data');
      });

      it('should cleanup old data', async () => {
        const result = await organizationAssistanceService.cleanupOrganizationData(
          'org-123',
          'OLD_DATA'
        );

        expect(result.cleanupType).toBe('OLD_DATA');
        expect(result.itemsModified).toBeDefined();
      });
    });

    describe('correctOrganizationData', () => {
      it('should apply multiple data corrections', async () => {
        const corrections = [
          {
            field: 'email',
            oldValue: 'wrong@email.com',
            newValue: 'correct@email.com',
            reason: 'Email was incorrectly entered during signup'
          },
          {
            field: 'phone',
            oldValue: '+92300000000',
            newValue: '+923001234567',
            reason: 'Correcting phone number format'
          }
        ];

        const result = await organizationAssistanceService.correctOrganizationData(
          'org-123',
          corrections
        );

        expect(result.totalCorrections).toBe(2);
        expect(result.successful).toBe(2);
        expect(result.failed).toBe(0);
        expect(result.results.appliedCorrections).toHaveLength(2);
      });

      it('should handle corrections with errors gracefully', async () => {
        const corrections = [
          {
            field: 'invalid_field',
            oldValue: 'old',
            newValue: 'new',
            reason: 'Test correction'
          }
        ];

        const result = await organizationAssistanceService.correctOrganizationData(
          'org-123',
          corrections
        );

        expect(result.totalCorrections).toBe(1);
        // Should not throw, but handle gracefully
        expect(result).toBeDefined();
      });
    });
  });

  // ============================================================================
  // NEW FEATURES TESTS - Missing Features Implementation
  // ============================================================================

  describe('New Features: Send Test WhatsApp Messages', () => {
    
    describe('sendTestWhatsAppMessage', () => {
      it('should send test message successfully', async () => {
        const mockOrg = {
          id: 'org-123',
          name: 'Test Clinic',
          whatsappPhoneNumber: '+923001234567',
          whatsappCredentials: { accessToken: 'test_token' }
        };

        mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

        const result = await organizationAssistanceService.sendTestWhatsAppMessage(
          'org-123',
          '+923009876543'
        );

        expect(result.success).toBe(true);
        expect(result.messageId).toBeDefined();
        expect(result.recipient).toBe('+923009876543');
        expect(result.sentAt).toBeInstanceOf(Date);
        expect(result.messageBody).toContain('Test Clinic');
      });

      it('should handle missing credentials', async () => {
        const mockOrg = {
          id: 'org-123',
          name: 'Test Clinic',
          whatsappPhoneNumber: '+923001234567',
          whatsappCredentials: null
        };

        mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

        const result = await organizationAssistanceService.sendTestWhatsAppMessage(
          'org-123',
          '+923009876543'
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('WhatsApp credentials not configured');
      });

      it('should return message details with test message body', async () => {
        const mockOrg = {
          id: 'org-123',
          name: 'My Awesome Clinic',
          whatsappPhoneNumber: '+923001234567',
          whatsappCredentials: { accessToken: 'test_token' }
        };

        mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

        const result = await organizationAssistanceService.sendTestWhatsAppMessage(
          'org-123',
          '+923009876543'
        );

        expect(result.messageBody).toContain('My Awesome Clinic');
        expect(result.messageBody).toContain('test message');
      });
    });

    describe('testWhatsAppConfig with sendTestMessage', () => {
      it('should send test message when requested', async () => {
        const mockOrg = {
          id: 'org-123',
          whatsappPhoneNumber: '+923001234567',
          whatsappBusinessId: 'wa-biz-123',
          whatsappConfigured: true,
          whatsappCredentials: { accessToken: 'test_token' },
          phone: '+923001234567'
        };

        mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

        const result = await organizationAssistanceService.testWhatsAppConfig('org-123', true);

        expect(result.configured).toBe(true);
        expect(result.testMessageSent).toBe(true);
        expect(result.testMessageDetails).toBeDefined();
        expect(result.testMessageDetails.success).toBe(true);
        expect(result.connectionStatus).toBe('SUCCESS');
      });

      it('should not send test message when not requested', async () => {
        const mockOrg = {
          id: 'org-123',
          whatsappPhoneNumber: '+923001234567',
          whatsappBusinessId: 'wa-biz-123',
          whatsappConfigured: true,
          whatsappCredentials: { accessToken: 'test_token' },
          phone: '+923001234567'
        };

        mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

        const result = await organizationAssistanceService.testWhatsAppConfig('org-123', false);

        expect(result.configured).toBe(true);
        expect(result.testMessageSent).toBe(false);
        expect(result.connectionStatus).toBe('SUCCESS');
      });
    });
  });

  describe('New Features: Trigger Manual Sync', () => {
    
    describe('triggerManualSync', () => {
      it('should trigger sync successfully', async () => {
        const mockOrg = {
          id: 'org-123',
          name: 'Test Clinic',
          googleSheetsId: 'sheet-123',
          googleSheetsTokens: { accessToken: 'test_token' }
        };

        mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

        const result: any = await organizationAssistanceService.triggerManualSync('org-123');

        expect(result.success).toBe(true);
        expect(result.syncedAt).toBeInstanceOf(Date);
        expect(result.statistics).toBeDefined();
        expect(result.statistics.patientsSync).toBeDefined();
        expect(result.statistics.appointmentsSync).toBeDefined();
        expect(result.statistics.providersSync).toBeDefined();
        expect(result.duration).toBeGreaterThan(0);
      });

      it('should handle missing Sheet ID', async () => {
        const mockOrg = {
          id: 'org-123',
          name: 'Test Clinic',
          googleSheetsId: null,
          googleSheetsTokens: { accessToken: 'test_token' }
        };

        mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

        const result: any = await organizationAssistanceService.triggerManualSync('org-123');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Google Sheets not configured');
      });

      it('should return sync statistics', async () => {
        const mockOrg = {
          id: 'org-123',
          name: 'Test Clinic',
          googleSheetsId: 'sheet-123',
          googleSheetsTokens: { accessToken: 'test_token' }
        };

        mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

        const result: any = await organizationAssistanceService.triggerManualSync('org-123');

        expect(result.statistics).toHaveProperty('patientsSync');
        expect(result.statistics).toHaveProperty('appointmentsSync');
        expect(result.statistics).toHaveProperty('providersSync');
        expect(result.statistics).toHaveProperty('errors');
      });
    });

    describe('testSheetsConnection with triggerSync', () => {
      it('should trigger sync when requested', async () => {
        const mockOrg = {
          id: 'org-123',
          googleSheetsId: 'sheet-123',
          googleSheetsTokens: { accessToken: 'test_token' }
        };

        mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

        const result = await organizationAssistanceService.testSheetsConnection('org-123', true);

        expect(result.configured).toBe(true);
        expect(result.syncTriggered).toBe(true);
        expect(result.syncDetails).toBeDefined();
        expect(result.syncDetails.success).toBe(true);
        expect(result.connectionStatus).toBe('SUCCESS');
      });

      it('should not trigger sync when not requested', async () => {
        const mockOrg = {
          id: 'org-123',
          googleSheetsId: 'sheet-123',
          googleSheetsTokens: { accessToken: 'test_token' }
        };

        mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

        const result = await organizationAssistanceService.testSheetsConnection('org-123', false);

        expect(result.configured).toBe(true);
        expect(result.syncTriggered).toBe(false);
        expect(result.connectionStatus).toBe('SUCCESS');
      });
    });
  });

  describe('New Features: Billing Disputes', () => {
    
    describe('handleBillingDispute', () => {
      it('should create dispute successfully', async () => {
        const mockOrg = {
          id: 'org-123',
          name: 'Test Clinic',
          email: 'test@clinic.com'
        };

        mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

        const disputeDetails = {
          amount: 5000,
          reason: 'Duplicate charge',
          description: 'I was charged twice for the same subscription',
          disputedChargeId: 'charge-123'
        };

        const result = await organizationAssistanceService.handleBillingDispute(
          'org-123',
          disputeDetails,
          'admin-456'
        );

        expect(result.success).toBe(true);
        expect(result.dispute).toBeDefined();
        expect(result.dispute.status).toBe('OPEN');
        expect(result.dispute.amount).toBe(5000);
        expect(result.dispute.reason).toBe('Duplicate charge');
        expect(result.dispute.createdBy).toBe('admin-456');
        expect(result.nextSteps).toBeDefined();
        expect(result.nextSteps.length).toBeGreaterThan(0);
      });

      it('should throw error for non-existent organization', async () => {
        mockPrisma.organization.findUnique.mockResolvedValue(null);

        const disputeDetails = {
          amount: 5000,
          reason: 'Test',
          description: 'Test description'
        };

        await expect(
          organizationAssistanceService.handleBillingDispute(
            'non-existent',
            disputeDetails,
            'admin-456'
          )
        ).rejects.toThrow('Failed to handle billing dispute');
      });
    });

    describe('resolveBillingDispute', () => {
      it('should resolve dispute with APPROVED outcome', async () => {
        const resolution = {
          outcome: 'APPROVED' as const,
          refundAmount: 5000,
          notes: 'Duplicate charge confirmed, refund processed'
        };

        const result = await organizationAssistanceService.resolveBillingDispute(
          'dispute-123',
          resolution,
          'admin-456'
        );

        expect(result.success).toBe(true);
        expect(result.dispute.status).toBe('RESOLVED');
        expect(result.dispute.resolution.outcome).toBe('APPROVED');
        expect(result.dispute.resolution.refundAmount).toBe(5000);
        expect(result.dispute.resolvedBy).toBe('admin-456');
      });

      it('should resolve dispute with REJECTED outcome', async () => {
        const resolution = {
          outcome: 'REJECTED' as const,
          notes: 'Charge was valid, no refund warranted'
        };

        const result = await organizationAssistanceService.resolveBillingDispute(
          'dispute-123',
          resolution,
          'admin-456'
        );

        expect(result.success).toBe(true);
        expect(result.dispute.status).toBe('REJECTED');
        expect(result.dispute.resolution.outcome).toBe('REJECTED');
      });

      it('should apply credit when creditAmount provided', async () => {
        const resolution = {
          outcome: 'APPROVED' as const,
          creditAmount: 3000,
          notes: 'Applied as account credit instead of refund'
        };

        const result = await organizationAssistanceService.resolveBillingDispute(
          'dispute-123',
          resolution,
          'admin-456'
        );

        expect(result.success).toBe(true);
        expect(result.dispute.resolution.creditAmount).toBe(3000);
      });
    });
  });

  describe('New Features: Remote Setup Completion', () => {
    
    describe('remoteSetupCompletion', () => {
      it('should complete WhatsApp config remotely', async () => {
        const mockOrg = {
          id: 'org-123',
          whatsappPhoneNumber: '+923001234567',
          googleSheetsId: null,
          users: []
        };

        mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

        const setupData = {
          completeWhatsAppConfig: true,
          completeSheetsIntegration: false,
          addDefaultProvider: false,
          createSampleData: false
        };

        const result = await organizationAssistanceService.remoteSetupCompletion(
          'org-123',
          setupData,
          'admin-456'
        );

        expect(result.success).toBe(true);
        expect(result.results.completedSteps).toContain('WhatsApp configuration completed');
        expect(result.completedBy).toBe('admin-456');
      });

      it('should complete Sheets integration remotely', async () => {
        const mockOrg = {
          id: 'org-123',
          whatsappPhoneNumber: null,
          googleSheetsId: 'sheet-123',
          users: []
        };

        mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

        const setupData = {
          completeWhatsAppConfig: false,
          completeSheetsIntegration: true,
          addDefaultProvider: false,
          createSampleData: false
        };

        const result = await organizationAssistanceService.remoteSetupCompletion(
          'org-123',
          setupData,
          'admin-456'
        );

        expect(result.success).toBe(true);
        expect(result.results.completedSteps).toContain('Google Sheets integration completed');
      });

      it('should add default provider when no doctors exist', async () => {
        const mockOrg = {
          id: 'org-123',
          whatsappPhoneNumber: null,
          googleSheetsId: null,
          users: [
            { id: 'user-1', role: 'ORG_ADMIN' }
          ]
        };

        mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

        const setupData = {
          completeWhatsAppConfig: false,
          completeSheetsIntegration: false,
          addDefaultProvider: true,
          createSampleData: false
        };

        const result = await organizationAssistanceService.remoteSetupCompletion(
          'org-123',
          setupData,
          'admin-456'
        );

        expect(result.success).toBe(true);
        expect(result.results.completedSteps).toContain('Default provider added');
      });

      it('should create sample data when requested', async () => {
        const mockOrg = {
          id: 'org-123',
          whatsappPhoneNumber: null,
          googleSheetsId: null,
          users: []
        };

        mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

        const setupData = {
          completeWhatsAppConfig: false,
          completeSheetsIntegration: false,
          addDefaultProvider: false,
          createSampleData: true
        };

        const result = await organizationAssistanceService.remoteSetupCompletion(
          'org-123',
          setupData,
          'admin-456'
        );

        expect(result.success).toBe(true);
        expect(result.results.completedSteps).toContain('Sample data created');
      });

      it('should handle warnings for unavailable features', async () => {
        const mockOrg = {
          id: 'org-123',
          whatsappPhoneNumber: null, // No WhatsApp number
          googleSheetsId: null,
          users: [
            { id: 'user-1', role: 'DOCTOR' } // Already has doctor
          ]
        };

        mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

        const setupData = {
          completeWhatsAppConfig: true, // Requested but not available
          completeSheetsIntegration: false,
          addDefaultProvider: true, // Requested but already has provider
          createSampleData: false
        };

        const result = await organizationAssistanceService.remoteSetupCompletion(
          'org-123',
          setupData,
          'admin-456'
        );

        expect(result.success).toBe(true);
        expect(result.results.warnings.length).toBeGreaterThan(0);
        expect(result.results.warnings).toContain('WhatsApp phone number not available - skipped');
      });
    });
  });

  describe('New Features: Data Migration Assistance', () => {
    
    describe('assistDataMigration', () => {
      it('should run migration in dry-run mode', async () => {
        const mockOrg = {
          id: 'org-123',
          name: 'Test Clinic'
        };

        mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

        const migrationDetails = {
          sourceSystem: 'Legacy EMR',
          dataType: 'PATIENTS' as const,
          dryRun: true
        };

        const result = await organizationAssistanceService.assistDataMigration(
          'org-123',
          migrationDetails,
          'admin-456'
        );

        expect(result.success).toBe(true);
        expect(result.migration.dryRun).toBe(true);
        expect(result.migration.statistics.patientsImported).toBe(0); // Dry run doesn't import
        expect(result.migration.validationIssues).toContain('Dry run mode - no data was imported');
        expect(result.migratedBy).toBe('admin-456');
      });

      it('should migrate patients successfully', async () => {
        const mockOrg = {
          id: 'org-123',
          name: 'Test Clinic'
        };

        mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

        const migrationDetails = {
          sourceSystem: 'Excel',
          dataType: 'PATIENTS' as const,
          dryRun: false
        };

        const result = await organizationAssistanceService.assistDataMigration(
          'org-123',
          migrationDetails,
          'admin-456'
        );

        expect(result.success).toBe(true);
        expect(result.migration.dryRun).toBe(false);
        expect(result.migration.statistics.patientsImported).toBeGreaterThanOrEqual(0);
        expect(result.migration.statistics.appointmentsImported).toBe(0);
      });

      it('should migrate all data types', async () => {
        const mockOrg = {
          id: 'org-123',
          name: 'Test Clinic'
        };

        mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

        const migrationDetails = {
          sourceSystem: 'Old System',
          dataType: 'ALL' as const,
          dryRun: false
        };

        const result = await organizationAssistanceService.assistDataMigration(
          'org-123',
          migrationDetails,
          'admin-456'
        );

        expect(result.success).toBe(true);
        expect(result.migration.statistics.patientsImported).toBeGreaterThanOrEqual(0);
        expect(result.migration.statistics.appointmentsImported).toBeGreaterThanOrEqual(0);
        expect(result.migration.statistics.providersImported).toBeGreaterThanOrEqual(0);
      });

      it('should include mappings and data file options', async () => {
        const mockOrg = {
          id: 'org-123',
          name: 'Test Clinic'
        };

        mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

        const migrationDetails = {
          sourceSystem: 'Custom System',
          dataType: 'PATIENTS' as const,
          dataFile: '/path/to/data.csv',
          mappings: {
            'patient_name': 'fullName',
            'patient_phone': 'phoneNumber'
          },
          dryRun: true
        };

        const result = await organizationAssistanceService.assistDataMigration(
          'org-123',
          migrationDetails,
          'admin-456'
        );

        expect(result.success).toBe(true);
        expect(result.migration.sourceSystem).toBe('Custom System');
        expect(result.migration.dataType).toBe('PATIENTS');
      });
    });
  });

  describe('New Features: Billing Email Templates', () => {
    
    describe('getBillingEmailTemplates', () => {
      it('should return all billing email templates', () => {
        const templates = organizationAssistanceService.getBillingEmailTemplates();

        expect(templates).toBeDefined();
        expect(templates.PAYMENT_FAILURE).toBeDefined();
        expect(templates.PAYMENT_OVERDUE).toBeDefined();
        expect(templates.BILLING_DISPUTE_CREATED).toBeDefined();
        expect(templates.BILLING_DISPUTE_RESOLVED).toBeDefined();
        expect(templates.CREDIT_APPLIED).toBeDefined();
      });

      it('should have correct template structure', () => {
        const templates = organizationAssistanceService.getBillingEmailTemplates();
        const paymentFailure = templates.PAYMENT_FAILURE;

        expect(paymentFailure.subject).toBeDefined();
        expect(paymentFailure.body).toBeDefined();
        expect(paymentFailure.category).toBe('BILLING');
        expect(paymentFailure.variables).toBeInstanceOf(Array);
        expect(paymentFailure.variables.length).toBeGreaterThan(0);
      });

      it('should include variable placeholders in template body', () => {
        const templates = organizationAssistanceService.getBillingEmailTemplates();
        const paymentFailure = templates.PAYMENT_FAILURE;

        expect(paymentFailure.body).toContain('{{organizationName}}');
        expect(paymentFailure.body).toContain('{{amount}}');
        expect(paymentFailure.variables).toContain('organizationName');
        expect(paymentFailure.variables).toContain('amount');
      });

      it('should have templates for all billing scenarios', () => {
        const templates = organizationAssistanceService.getBillingEmailTemplates();

        // Check all required templates exist
        expect(Object.keys(templates)).toEqual(
          expect.arrayContaining([
            'PAYMENT_FAILURE',
            'PAYMENT_OVERDUE',
            'BILLING_DISPUTE_CREATED',
            'BILLING_DISPUTE_RESOLVED',
            'CREDIT_APPLIED'
          ])
        );
      });

      it('should have appropriate subjects for each template', () => {
        const templates = organizationAssistanceService.getBillingEmailTemplates();

        expect(templates.PAYMENT_FAILURE.subject).toContain('Payment Failed');
        expect(templates.PAYMENT_OVERDUE.subject).toContain('Overdue');
        expect(templates.BILLING_DISPUTE_CREATED.subject).toContain('Dispute');
        expect(templates.CREDIT_APPLIED.subject).toContain('Credit');
      });
    });
  });
});
