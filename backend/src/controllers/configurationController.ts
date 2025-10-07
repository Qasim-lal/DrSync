/**
 * Configuration Controller
 * Handles API endpoints for organization configuration wizards
 * - WhatsApp Business API setup
 * - Google Sheets integration
 * - Staff invitation and management
 */

import { Request, Response } from 'express';
import whatsappIntegrationService from '../services/whatsappIntegrationService';
import googleSheetsIntegrationService from '../services/googleSheetsIntegrationService';
import { configurationStatusService } from '../services/configurationStatusService';

/**
 * WhatsApp Configuration Endpoints
 */

// Validate WhatsApp credentials
export const validateWhatsAppCredentials = async (req: Request, res: Response) => {
  try {
    const { appId, appSecret, accessToken, phoneNumberId } = req.body;
    const organizationId = req.user!.organizationId;

    if (!appId || !appSecret || !accessToken || !phoneNumberId) {
      return res.status(400).json({
        success: false,
        message: 'All credentials are required',
      });
    }

    const result = await whatsappIntegrationService.validateCredentials(
      { appId, appSecret, accessToken, phoneNumberId },
      organizationId
    );

    return res.status(result.isValid ? 200 : 400).json({
      success: result.isValid,
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Generate webhook URL
export const generateWebhookUrl = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;

    const webhookUrl = await whatsappIntegrationService.generateWebhookUrl(organizationId);
    const verifyToken = whatsappIntegrationService.generateVerifyToken();

    return res.status(200).json({
      success: true,
      data: {
        webhookUrl,
        verifyToken,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Configure webhook
export const configureWhatsAppWebhook = async (req: Request, res: Response) => {
  try {
    const { appId, appSecret, accessToken, phoneNumberId, webhookUrl, verifyToken } = req.body;
    const organizationId = req.user!.organizationId;

    const result = await whatsappIntegrationService.configureWebhook(
      { appId, appSecret, accessToken, phoneNumberId },
      { webhookUrl, verifyToken },
      organizationId
    );

    return res.status(result.isValid ? 200 : 400).json({
      success: result.isValid,
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Test webhook endpoint
export const testWebhookEndpoint = async (req: Request, res: Response) => {
  try {
    const { webhookUrl, verifyToken } = req.body;

    const result = await whatsappIntegrationService.testWebhookEndpoint(webhookUrl, verifyToken);

    return res.status(result.isValid ? 200 : 400).json({
      success: result.isValid,
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Register phone number
export const registerWhatsAppPhone = async (req: Request, res: Response) => {
  try {
    const { appId, appSecret, accessToken, phoneNumberId, phoneNumber } = req.body;
    const organizationId = req.user!.organizationId;

    const result = await whatsappIntegrationService.registerPhoneNumber(
      { appId, appSecret, accessToken, phoneNumberId },
      { phoneNumber },
      organizationId
    );

    return res.status(result.isValid ? 200 : 400).json({
      success: result.isValid,
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Verify phone number
export const verifyWhatsAppPhone = async (req: Request, res: Response) => {
  try {
    const { appId, appSecret, accessToken, phoneNumberId, phoneNumber, verificationCode } = req.body;
    const organizationId = req.user!.organizationId;

    const result = await whatsappIntegrationService.verifyPhoneNumber(
      { appId, appSecret, accessToken, phoneNumberId },
      { phoneNumber, verificationCode },
      organizationId
    );

    return res.status(result.isValid ? 200 : 400).json({
      success: result.isValid,
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Send test message
export const sendWhatsAppTestMessage = async (req: Request, res: Response) => {
  try {
    const { appId, appSecret, accessToken, phoneNumberId, recipientPhone, messageText } = req.body;
    const organizationId = req.user!.organizationId;

    const result = await whatsappIntegrationService.sendTestMessage(
      { appId, appSecret, accessToken, phoneNumberId },
      { recipientPhone, messageText },
      organizationId
    );

    return res.status(result.isValid ? 200 : 400).json({
      success: result.isValid,
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Save WhatsApp configuration
export const saveWhatsAppConfiguration = async (req: Request, res: Response) => {
  try {
    const { appId, appSecret, accessToken, phoneNumberId, webhookUrl, verifyToken } = req.body;
    const organizationId = req.user!.organizationId;

    const result = await whatsappIntegrationService.saveConfiguration(
      { appId, appSecret, accessToken, phoneNumberId },
      { webhookUrl, verifyToken },
      organizationId
    );

    return res.status(result.isValid ? 200 : 500).json({
      success: result.isValid,
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Validate WhatsApp setup
export const validateWhatsAppSetup = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;

    const result = await whatsappIntegrationService.validateCompleteSetup(organizationId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Google Sheets Configuration Endpoints
 */

// Generate OAuth URL
export const generateGoogleAuthUrl = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;

    const authUrl = googleSheetsIntegrationService.generateAuthUrl(organizationId);

    return res.status(200).json({
      success: true,
      data: {
        authUrl,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Handle OAuth callback
export const handleGoogleOAuthCallback = async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;
    const organizationId = state as string || req.user!.organizationId;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Authorization code is required',
      });
    }

    const result = await googleSheetsIntegrationService.handleOAuthCallback(
      code as string,
      organizationId
    );

    return res.status(result.isValid ? 200 : 400).json({
      success: result.isValid,
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// List available sheets
export const listGoogleSheets = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;

    const result = await googleSheetsIntegrationService.listSheets(organizationId);

    return res.status(result.isValid ? 200 : 400).json({
      success: result.isValid,
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Create new sheet
export const createGoogleSheet = async (req: Request, res: Response) => {
  try {
    const { sheetName } = req.body;
    const organizationId = req.user!.organizationId;

    if (!sheetName) {
      return res.status(400).json({
        success: false,
        message: 'Sheet name is required',
      });
    }

    const result = await googleSheetsIntegrationService.createSheet(organizationId, sheetName);

    return res.status(result.isValid ? 200 : 400).json({
      success: result.isValid,
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Select existing sheet
export const selectGoogleSheet = async (req: Request, res: Response) => {
  try {
    const { sheetId } = req.body;
    const organizationId = req.user!.organizationId;

    if (!sheetId) {
      return res.status(400).json({
        success: false,
        message: 'Sheet ID is required',
      });
    }

    const result = await googleSheetsIntegrationService.selectSheet(organizationId, sheetId);

    return res.status(result.isValid ? 200 : 400).json({
      success: result.isValid,
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Setup sheet structure
export const setupSheetStructure = async (req: Request, res: Response) => {
  try {
    const { sheetId, structureType, headers, customColumns } = req.body;
    const organizationId = req.user!.organizationId;

    if (!sheetId) {
      return res.status(400).json({
        success: false,
        message: 'Sheet ID is required',
      });
    }

    const result = await googleSheetsIntegrationService.setupSheetStructure(
      organizationId,
      sheetId,
      { structureType: structureType || 'default', headers, customColumns }
    );

    return res.status(result.isValid ? 200 : 400).json({
      success: result.isValid,
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Verify permissions
export const verifySheetPermissions = async (req: Request, res: Response) => {
  try {
    const { sheetId } = req.body;
    const organizationId = req.user!.organizationId;

    if (!sheetId) {
      return res.status(400).json({
        success: false,
        message: 'Sheet ID is required',
      });
    }

    const result = await googleSheetsIntegrationService.verifyPermissions(organizationId, sheetId);

    return res.status(result.isValid ? 200 : 400).json({
      success: result.isValid,
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Test data operations
export const testSheetDataOperations = async (req: Request, res: Response) => {
  try {
    const { sheetId } = req.body;
    const organizationId = req.user!.organizationId;

    if (!sheetId) {
      return res.status(400).json({
        success: false,
        message: 'Sheet ID is required',
      });
    }

    const result = await googleSheetsIntegrationService.testDataOperations(organizationId, sheetId);

    return res.status(result.isValid ? 200 : 400).json({
      success: result.isValid,
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Activate sync service
export const activateSyncService = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;

    const result = await googleSheetsIntegrationService.activateSyncService(organizationId);

    return res.status(result.isValid ? 200 : 500).json({
      success: result.isValid,
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Validate Google Sheets setup
export const validateGoogleSheetsSetup = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;

    const result = await googleSheetsIntegrationService.validateCompleteSetup(organizationId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Configuration Status Endpoint
 */
export const getConfigurationStatus = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;

    // Get comprehensive configuration status using the new service
    const status = await configurationStatusService.getStatus(organizationId);

    return res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
