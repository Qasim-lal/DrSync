/**
 * Organization Assistance Controller - SUBTASK-038D-002
 * 
 * HTTP endpoints for super admin assistance tools
 */

import { Request, Response } from 'express';
import { organizationAssistanceService } from '../services/organizationAssistanceService';
import { logger } from '../utils/logger';

export class AssistanceController {

  /**
   * 038D-002-1: Get organization setup progress
   * GET /api/super-admin/support/setup-assistance/:orgId
   */
  async getSetupProgress(req: Request, res: Response) {
    try {
      const { orgId } = req.params;

      const progress = await organizationAssistanceService.getSetupProgress(orgId as string);

      return res.status(200).json({
        success: true,
        data: progress
      });
    } catch (error: any) {
      logger.error('Error getting setup progress:', error);
      return res.status(500).json({
        error: 'Failed to get setup progress',
        details: error.message
      });
    }
  }

  /**
   * 038D-002-1: Send setup reminder
   * POST /api/super-admin/support/setup-assistance/:orgId/remind
   */
  async sendSetupReminder(req: Request, res: Response) {
    try {
      const { orgId } = req.params;
      const { reminderType } = req.body;

      if (!reminderType || !['INCOMPLETE_SETUP', 'WHATSAPP_CONFIG', 'SHEETS_INTEGRATION'].includes(reminderType)) {
        return res.status(400).json({
          error: 'Invalid reminderType. Must be INCOMPLETE_SETUP, WHATSAPP_CONFIG, or SHEETS_INTEGRATION'
        });
      }

      const result = await organizationAssistanceService.sendSetupReminder(orgId as string, reminderType);

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Error sending setup reminder:', error);
      return res.status(500).json({
        error: 'Failed to send setup reminder',
        details: error.message
      });
    }
  }

  /**
   * 038D-002-2: Test WhatsApp configuration
   * POST /api/super-admin/support/test-whatsapp/:orgId
   */
  async testWhatsAppConfig(req: Request, res: Response) {
    try {
      const { orgId } = req.params;
      const { sendTestMessage } = req.body;

      const results = await organizationAssistanceService.testWhatsAppConfig(
        orgId as string,
        sendTestMessage || false
      );

      return res.status(200).json({
        success: true,
        data: results
      });
    } catch (error: any) {
      logger.error('Error testing WhatsApp config:', error);
      return res.status(500).json({
        error: 'Failed to test WhatsApp configuration',
        details: error.message
      });
    }
  }


  /**
   * 038D-002-2: Test Google Sheets connection
   * POST /api/super-admin/support/test-sheets/:orgId
   */
  async testSheetsConnection(req: Request, res: Response) {
    try {
      const { orgId } = req.params;
      const { triggerSync } = req.body;

      const results = await organizationAssistanceService.testSheetsConnection(
        orgId as string,
        triggerSync || false
      );

      return res.status(200).json({
        success: true,
        data: results
      });
    } catch (error: any) {
      logger.error('Error testing Sheets connection:', error);
      return res.status(500).json({
        error: 'Failed to test Google Sheets connection',
        details: error.message
      });
    }
  }

  /**
   * 038D-002-2: Run diagnostics
   * POST /api/super-admin/support/diagnostics/:orgId
   */
  async runDiagnostics(req: Request, res: Response) {
    try {
      const { orgId } = req.params;

      const diagnostics = await organizationAssistanceService.runDiagnostics(orgId as string);

      return res.status(200).json({
        success: true,
        data: diagnostics
      });
    } catch (error: any) {
      logger.error('Error running diagnostics:', error);
      return res.status(500).json({
        error: 'Failed to run diagnostics',
        details: error.message
      });
    }
  }

  /**
   * 038D-002-2: Apply common fixes
   * POST /api/super-admin/support/fix/:orgId
   */
  async applyFix(req: Request, res: Response) {
    try {
      const { orgId } = req.params;
      const { fixType } = req.body;

      if (!fixType || !['RESET_TOKENS', 'CLEAR_CACHE', 'REAUTHORIZE_INTEGRATIONS'].includes(fixType)) {
        return res.status(400).json({
          error: 'Invalid fixType. Must be RESET_TOKENS, CLEAR_CACHE, or REAUTHORIZE_INTEGRATIONS'
        });
      }

      const result = await organizationAssistanceService.applyCommonFixes(orgId as string, fixType);

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Error applying fix:', error);
      return res.status(500).json({
        error: 'Failed to apply fix',
        details: error.message
      });
    }
  }

  /**
   * 038D-002-4: Force password reset
   * POST /api/super-admin/support/users/:userId/force-reset
   */
  async forcePasswordReset(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const requestedBy = (req.user?.id as string) || 'SUPER_ADMIN';

      const result = await organizationAssistanceService.forcePasswordReset(userId as string, requestedBy);

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Error forcing password reset:', error);
      return res.status(500).json({
        error: 'Failed to force password reset',
        details: error.message
      });
    }
  }

  /**
   * 038D-002-4: Disable MFA
   * POST /api/super-admin/support/users/:userId/disable-mfa
   */
  async disableMFA(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { reason } = req.body;
      const requestedBy = (req.user?.id as string) || 'SUPER_ADMIN';

      if (!reason) {
        return res.status(400).json({
          error: 'Reason is required for MFA disable'
        });
      }

      const result = await organizationAssistanceService.disableMFA(userId as string, requestedBy, reason);

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Error disabling MFA:', error);
      return res.status(500).json({
        error: 'Failed to disable MFA',
        details: error.message
      });
    }
  }

  /**
   * 038D-002-4: Verify/update user email
   * POST /api/super-admin/support/users/:userId/verify-email
   */
  async verifyEmail(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { newEmail } = req.body;

      const result = await organizationAssistanceService.verifyEmail(userId as string, newEmail);

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Error verifying email:', error);
      return res.status(500).json({
        error: 'Failed to verify email',
        details: error.message
      });
    }
  }

  /**
   * 038D-002-3: Retry failed payment
   * POST /api/super-admin/support/billing/retry-payment/:orgId
   */
  async retryPayment(req: Request, res: Response) {
    try {
      const { orgId } = req.params;

      const result = await organizationAssistanceService.retryFailedPayment(orgId as string);

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Error retrying payment:', error);
      return res.status(500).json({
        error: 'Failed to retry payment',
        details: error.message
      });
    }
  }

  /**
   * 038D-002-3: Apply credit
   * POST /api/super-admin/support/billing/apply-credit/:orgId
   */
  async applyCredit(req: Request, res: Response) {
    try {
      const { orgId } = req.params;
      const { amount, reason } = req.body;
      const appliedBy = (req.user?.id as string) || 'SUPER_ADMIN';

      if (!amount || amount <= 0) {
        return res.status(400).json({
          error: 'Valid credit amount is required'
        });
      }

      if (!reason) {
        return res.status(400).json({
          error: 'Reason is required for applying credit'
        });
      }

      const result = await organizationAssistanceService.applyCredit(orgId as string, amount, reason, appliedBy);

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Error applying credit:', error);
      return res.status(500).json({
        error: 'Failed to apply credit',
        details: error.message
      });
    }
  }

  /**
   * 038D-002-3: Update payment method
   * POST /api/super-admin/support/billing/update-payment-method/:orgId
   */
  async updatePaymentMethod(req: Request, res: Response) {
    try {
      const { orgId } = req.params;
      const { paymentMethodId } = req.body;

      if (!paymentMethodId) {
        return res.status(400).json({
          error: 'Payment method ID is required'
        });
      }

      const result = await organizationAssistanceService.updatePaymentMethod(orgId as string, paymentMethodId);

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Error updating payment method:', error);
      return res.status(500).json({
        error: 'Failed to update payment method',
        details: error.message
      });
    }
  }

  /**
   * 038D-002-5: Validate organization data
   * POST /api/super-admin/support/data/validate/:orgId
   */
  async validateData(req: Request, res: Response) {
    try {
      const { orgId } = req.params;

      const validation = await organizationAssistanceService.validateOrganizationData(orgId as string);

      return res.status(200).json({
        success: true,
        data: validation
      });
    } catch (error: any) {
      logger.error('Error validating data:', error);
      return res.status(500).json({
        error: 'Failed to validate data',
        details: error.message
      });
    }
  }

  /**
   * 038D-002-5: Cleanup organization data
   * POST /api/super-admin/support/data/cleanup/:orgId
   */
  async cleanupData(req: Request, res: Response) {
    try {
      const { orgId } = req.params;
      const { cleanupType } = req.body;

      if (!cleanupType || !['DUPLICATES', 'TEST_DATA', 'OLD_DATA'].includes(cleanupType)) {
        return res.status(400).json({
          error: 'Invalid cleanupType. Must be DUPLICATES, TEST_DATA, or OLD_DATA'
        });
      }

      const result = await organizationAssistanceService.cleanupOrganizationData(orgId as string, cleanupType);

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Error cleaning up data:', error);
      return res.status(500).json({
        error: 'Failed to cleanup data',
        details: error.message
      });
    }
  }

  /**
   * 038D-002-5: Correct organization data
   * POST /api/super-admin/support/data/correct/:orgId
   */
  async correctData(req: Request, res: Response) {
    try {
      const { orgId } = req.params;
      const { corrections } = req.body;

      if (!corrections || !Array.isArray(corrections) || corrections.length === 0) {
        return res.status(400).json({
          error: 'Corrections array is required'
        });
      }

      // Validate corrections format
      for (const correction of corrections) {
        if (!correction.field || !correction.reason) {
          return res.status(400).json({
            error: 'Each correction must have field and reason'
          });
        }
      }

      const result = await organizationAssistanceService.correctOrganizationData(orgId as string, corrections);

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Error correcting data:', error);
      return res.status(500).json({
        error: 'Failed to correct data',
        details: error.message
      });
    }
  }

  /**
   * 038D-002-2: Trigger manual sync
   * POST /api/super-admin/support/sync/:orgId
   */
  async triggerSync(req: Request, res: Response) {
    try {
      const { orgId } = req.params;

      const result = await organizationAssistanceService.triggerManualSync(orgId as string);

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Error triggering sync:', error);
      return res.status(500).json({
        error: 'Failed to trigger sync',
        details: error.message
      });
    }
  }

  /**
   * 038D-002-3: Handle billing dispute
   * POST /api/super-admin/support/billing/dispute/:orgId
   */
  async handleBillingDispute(req: Request, res: Response) {
    try {
      const { orgId } = req.params;
      const { amount, reason, description, disputedChargeId } = req.body;
      const adminId = (req.user?.id as string) || 'SUPER_ADMIN';

      if (!amount || !reason || !description) {
        return res.status(400).json({
          error: 'Amount, reason, and description are required'
        });
      }

      const result = await organizationAssistanceService.handleBillingDispute(
        orgId as string,
        { amount, reason, description, disputedChargeId },
        adminId
      );

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Error handling billing dispute:', error);
      return res.status(500).json({
        error: 'Failed to handle billing dispute',
        details: error.message
      });
    }
  }

  /**
   * 038D-002-3: Resolve billing dispute
   * POST /api/super-admin/support/billing/dispute/:disputeId/resolve
   */
  async resolveBillingDispute(req: Request, res: Response) {
    try {
      const { disputeId } = req.params;
      const { outcome, refundAmount, creditAmount, notes } = req.body;
      const adminId = (req.user?.id as string) || 'SUPER_ADMIN';

      if (!outcome || !['APPROVED', 'REJECTED'].includes(outcome)) {
        return res.status(400).json({
          error: 'Outcome must be APPROVED or REJECTED'
        });
      }

      if (!notes) {
        return res.status(400).json({
          error: 'Resolution notes are required'
        });
      }

      const result = await organizationAssistanceService.resolveBillingDispute(
        disputeId as string,
        { outcome, refundAmount, creditAmount, notes },
        adminId
      );

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Error resolving billing dispute:', error);
      return res.status(500).json({
        error: 'Failed to resolve billing dispute',
        details: error.message
      });
    }
  }

  /**
   * 038D-002-1: Remote setup completion
   * POST /api/super-admin/support/remote-setup/:orgId
   */
  async remoteSetupCompletion(req: Request, res: Response) {
    try {
      const { orgId } = req.params;
      const { completeWhatsAppConfig, completeSheetsIntegration, addDefaultProvider, createSampleData } = req.body;
      const adminId = (req.user?.id as string) || 'SUPER_ADMIN';

      const result = await organizationAssistanceService.remoteSetupCompletion(
        orgId as string,
        {
          completeWhatsAppConfig,
          completeSheetsIntegration,
          addDefaultProvider,
          createSampleData
        },
        adminId
      );

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Error completing remote setup:', error);
      return res.status(500).json({
        error: 'Failed to complete remote setup',
        details: error.message
      });
    }
  }

  /**
   * 038D-002-5: Assist with data migration
   * POST /api/super-admin/support/data/migrate/:orgId
   */
  async assistDataMigration(req: Request, res: Response) {
    try {
      const { orgId } = req.params;
      const { sourceSystem, dataType, dataFile, mappings, dryRun } = req.body;
      const adminId = (req.user?.id as string) || 'SUPER_ADMIN';

      if (!sourceSystem || !dataType) {
        return res.status(400).json({
          error: 'sourceSystem and dataType are required'
        });
      }

      if (!['PATIENTS', 'APPOINTMENTS', 'PROVIDERS', 'ALL'].includes(dataType)) {
        return res.status(400).json({
          error: 'dataType must be PATIENTS, APPOINTMENTS, PROVIDERS, or ALL'
        });
      }

      const result = await organizationAssistanceService.assistDataMigration(
        orgId as string,
        { sourceSystem, dataType, dataFile, mappings, dryRun },
        adminId
      );

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Error assisting data migration:', error);
      return res.status(500).json({
        error: 'Failed to assist with data migration',
        details: error.message
      });
    }
  }

  /**
   * Get billing email templates
   * GET /api/super-admin/support/billing/email-templates
   */
  async getBillingEmailTemplates(_req: Request, res: Response) {
    try {
      const templates = organizationAssistanceService.getBillingEmailTemplates();

      return res.status(200).json({
        success: true,
        data: templates
      });
    } catch (error: any) {
      logger.error('Error getting billing email templates:', error);
      return res.status(500).json({
        error: 'Failed to get billing email templates',
        details: error.message
      });
    }
  }
}

export const assistanceController = new AssistanceController();
