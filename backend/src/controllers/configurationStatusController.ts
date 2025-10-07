/**
 * Configuration Status Controller
 * Handles configuration status API endpoints
 */

import { Request, Response } from 'express';
import { configurationStatusService } from '../services/configurationStatusService';

/**
 * Get configuration status for the authenticated user's organization
 */
export const getConfigurationStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      res.status(400).json({
        success: false,
        message: 'Organization ID not found in user context',
      });
      return;
    }

    const status = await configurationStatusService.getStatus(organizationId);

    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    console.error('Error fetching configuration status:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch configuration status',
    });
  }
};

/**
 * Update WhatsApp configuration status
 */
export const updateWhatsAppStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const organizationId = req.user?.organizationId;
    const { phoneNumber, phoneVerified, configured } = req.body;

    if (!organizationId) {
      res.status(400).json({
        success: false,
        message: 'Organization ID not found in user context',
      });
      return;
    }

    await configurationStatusService.updateWhatsAppStatus(organizationId, {
      phoneNumber,
      phoneVerified,
      configured,
    });

    res.status(200).json({
      success: true,
      message: 'WhatsApp configuration status updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating WhatsApp status:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update WhatsApp status',
    });
  }
};

/**
 * Update Google Sheets configuration status
 */
export const updateGoogleSheetsStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const organizationId = req.user?.organizationId;
    const { sheetsId, syncEnabled } = req.body;

    if (!organizationId) {
      res.status(400).json({
        success: false,
        message: 'Organization ID not found in user context',
      });
      return;
    }

    await configurationStatusService.updateGoogleSheetsStatus(organizationId, {
      sheetsId,
      syncEnabled,
    });

    res.status(200).json({
      success: true,
      message: 'Google Sheets configuration status updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating Google Sheets status:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update Google Sheets status',
    });
  }
};

/**
 * Check if setup is complete
 */
export const checkSetupComplete = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      res.status(400).json({
        success: false,
        message: 'Organization ID not found in user context',
      });
      return;
    }

    const isComplete = await configurationStatusService.isSetupComplete(
      organizationId
    );

    res.status(200).json({
      success: true,
      data: {
        setupComplete: isComplete,
      },
    });
  } catch (error: any) {
    console.error('Error checking setup completion:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to check setup completion',
    });
  }
};

/**
 * Get next recommended setup step
 */
export const getNextSetupStep = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      res.status(400).json({
        success: false,
        message: 'Organization ID not found in user context',
      });
      return;
    }

    const nextStep = await configurationStatusService.getNextSetupStep(
      organizationId
    );

    res.status(200).json({
      success: true,
      data: {
        nextStep,
      },
    });
  } catch (error: any) {
    console.error('Error getting next setup step:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get next setup step',
    });
  }
};
