/**
 * Google Sheets Integration Service
 * Handles Google Sheets integration for organization setup wizards
 * 
 * Features:
 * - OAuth2 authorization flow
 * - Sheet creation and selection
 * - Sheet structure setup
 * - Permission verification
 * - Data operations testing
 * - Sync service activation
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { getPrismaClient } from './prisma';

const prisma = getPrismaClient();

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  details?: any;
}

interface SheetInfo {
  id: string;
  name: string;
  url: string;
  hasData: boolean;
}

interface SheetStructure {
  structureType: 'default' | 'custom';
  headers: string[];
  customColumns?: Array<{ name: string; type: string }>;
}

interface PermissionCheck {
  canRead: boolean;
  canWrite: boolean;
  canShare: boolean;
}

export class GoogleSheetsIntegrationService {
  private oauth2Client: OAuth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
    );
  }

  /**
   * Generate OAuth2 authorization URL
   */
  generateAuthUrl(organizationId: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/userinfo.email',
    ];

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: organizationId, // Pass organization ID in state
      prompt: 'consent', // Force consent screen to get refresh token
    });

    return authUrl;
  }

  /**
   * Handle OAuth2 callback and exchange code for tokens
   */
  async handleOAuthCallback(code: string, organizationId: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const details: any = {};

    try {
      // Exchange authorization code for tokens
      const { tokens } = await this.oauth2Client.getToken(code);
      
      if (!tokens.access_token) {
        errors.push('Failed to obtain access token');
      }

      if (!tokens.refresh_token) {
        warnings.push('No refresh token received. You may need to re-authorize in the future.');
      }

      // Set credentials for this client
      this.oauth2Client.setCredentials(tokens);

      // Get user email
      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      
      details.authorizedEmail = userInfo.data.email;
      details.accessToken = tokens.access_token;
      details.refreshToken = tokens.refresh_token;
      details.expiryDate = tokens.expiry_date;

      // Save tokens to database
      if (errors.length === 0) {
        await prisma.organization.update({
          where: { id: organizationId },
          data: {
            googleSheetsTokens: {
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token,
              expiryDate: tokens.expiry_date,
              authorizedEmail: userInfo.data.email,
            },
          },
        });
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        details,
      };
    } catch (error: any) {
      return {
        isValid: false,
        errors: [`OAuth callback error: ${error.message}`],
        warnings,
        details,
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(organizationId: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const details: any = {};

    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        errors.push('Organization not found');
        return { isValid: false, errors, warnings, details };
      }

      const tokens = organization.googleSheetsTokens as any;
      
      if (!tokens?.refreshToken) {
        errors.push('Refresh token not found. Please re-authorize.');
        return { isValid: false, errors, warnings, details };
      }

      // Set refresh token
      this.oauth2Client.setCredentials({
        refresh_token: tokens.refreshToken,
      });

      // Refresh the token
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      details.accessToken = credentials.access_token;
      details.expiryDate = credentials.expiry_date;

      // Update database with new access token
      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          googleSheetsTokens: {
            ...tokens,
            accessToken: credentials.access_token,
            expiryDate: credentials.expiry_date,
          },
        },
      });

      return {
        isValid: true,
        errors,
        warnings,
        details,
      };
    } catch (error: any) {
      return {
        isValid: false,
        errors: [`Token refresh error: ${error.message}`],
        warnings,
        details,
      };
    }
  }

  /**
   * List available Google Sheets for the user
   */
  async listSheets(organizationId: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const details: any = {};

    try {
      await this.setOrgCredentials(organizationId);

      const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
      
      const response = await drive.files.list({
        q: "mimeType='application/vnd.google-apps.spreadsheet'",
        fields: 'files(id, name, webViewLink, modifiedTime)',
        pageSize: 50,
        orderBy: 'modifiedTime desc',
      });

      const sheets: SheetInfo[] = response.data.files?.map((file) => ({
        id: file.id || '',
        name: file.name || 'Untitled',
        url: file.webViewLink || '',
        hasData: false, // We'll check this separately if needed
      })) || [];

      details.sheets = sheets;
      details.count = sheets.length;

      return {
        isValid: true,
        errors,
        warnings,
        details,
      };
    } catch (error: any) {
      return {
        isValid: false,
        errors: [`Failed to list sheets: ${error.message}`],
        warnings,
        details,
      };
    }
  }

  /**
   * Create a new Google Sheet
   */
  async createSheet(organizationId: string, sheetName: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const details: any = {};

    try {
      await this.setOrgCredentials(organizationId);

      const sheets = google.sheets({ version: 'v4', auth: this.oauth2Client });
      
      // Create new spreadsheet
      const response = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: sheetName,
          },
          sheets: [
            {
              properties: {
                title: 'Appointments',
              },
            },
            {
              properties: {
                title: 'Patients',
              },
            },
            {
              properties: {
                title: 'Providers',
              },
            },
          ],
        },
      });

      const spreadsheetId = response.data.spreadsheetId;
      const spreadsheetUrl = response.data.spreadsheetUrl;

      details.sheetId = spreadsheetId;
      details.sheetUrl = spreadsheetUrl;
      details.sheetName = sheetName;
      details.message = 'Google Sheet created successfully';

      // Save sheet ID to database
      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          googleSheetsId: spreadsheetId || null,
          googleSheetsUrl: spreadsheetUrl || null,
        },
      });

      return {
        isValid: true,
        errors,
        warnings,
        details,
      };
    } catch (error: any) {
      return {
        isValid: false,
        errors: [`Failed to create sheet: ${error.message}`],
        warnings,
        details,
      };
    }
  }

  /**
   * Select existing sheet
   */
  async selectSheet(organizationId: string, sheetId: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const details: any = {};

    try {
      await this.setOrgCredentials(organizationId);

      const sheets = google.sheets({ version: 'v4', auth: this.oauth2Client });
      
      // Get sheet details
      const response = await sheets.spreadsheets.get({
        spreadsheetId: sheetId,
      });

      details.sheetId = sheetId;
      details.sheetName = response.data.properties?.title;
      details.sheetUrl = response.data.spreadsheetUrl;
      details.sheetCount = response.data.sheets?.length || 0;

      // Check if sheet has existing data
      if (response.data.sheets && response.data.sheets.length > 0) {
        const firstSheet = response.data.sheets[0];
        if (firstSheet && firstSheet.properties?.gridProperties) {
          const rowCount = firstSheet.properties.gridProperties.rowCount || 0;
          if (rowCount > 1) {
            warnings.push('Selected sheet contains existing data');
            details.hasExistingData = true;
          }
        }
      }

      // Save sheet ID to database
      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          googleSheetsId: sheetId || null,
          googleSheetsUrl: details.sheetUrl || null,
        },
      });

      return {
        isValid: true,
        errors,
        warnings,
        details,
      };
    } catch (error: any) {
      if (error.code === 404) {
        return {
          isValid: false,
          errors: ['Sheet not found. Please check the sheet ID and your access permissions.'],
          warnings,
          details,
        };
      }

      return {
        isValid: false,
        errors: [`Failed to select sheet: ${error.message}`],
        warnings,
        details,
      };
    }
  }

  /**
   * Setup sheet structure with headers
   */
  async setupSheetStructure(
    organizationId: string,
    sheetId: string,
    structure: SheetStructure
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const details: any = {};

    try {
      await this.setOrgCredentials(organizationId);

      const sheets = google.sheets({ version: 'v4', auth: this.oauth2Client });

      // Default headers for DrSync
      const defaultHeaders = {
        Appointments: [
          'ID', 'Patient Name', 'Patient Phone', 'Provider', 'Date', 'Time',
          'Duration', 'Status', 'Notes', 'Created At', 'Updated At'
        ],
        Patients: [
          'ID', 'Name', 'Phone', 'Email', 'Date of Birth', 'Gender',
          'Address', 'Emergency Contact', 'Created At'
        ],
        Providers: [
          'ID', 'Name', 'Specialization', 'Phone', 'Email',
          'Working Hours', 'Status', 'Created At'
        ],
      };

      const headersToUse = structure.structureType === 'custom' && structure.headers
        ? structure.headers
        : defaultHeaders.Appointments;

      // Write headers to Appointments sheet
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: 'Appointments!A1:K1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [headersToUse],
        },
      });

      // Format header row
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: 0,
                  startRowIndex: 0,
                  endRowIndex: 1,
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.2, green: 0.5, blue: 0.8 },
                    textFormat: {
                      foregroundColor: { red: 1, green: 1, blue: 1 },
                      fontSize: 11,
                      bold: true,
                    },
                  },
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat)',
              },
            },
          ],
        },
      });

      details.structureType = structure.structureType;
      details.headers = headersToUse;
      details.message = 'Sheet structure configured successfully';

      return {
        isValid: true,
        errors,
        warnings,
        details,
      };
    } catch (error: any) {
      return {
        isValid: false,
        errors: [`Failed to setup structure: ${error.message}`],
        warnings,
        details,
      };
    }
  }

  /**
   * Verify sheet permissions
   */
  async verifyPermissions(organizationId: string, sheetId: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const details: any = {};

    try {
      await this.setOrgCredentials(organizationId);

      const sheets = google.sheets({ version: 'v4', auth: this.oauth2Client });
      const drive = google.drive({ version: 'v3', auth: this.oauth2Client });

      const permissions: PermissionCheck = {
        canRead: false,
        canWrite: false,
        canShare: false,
      };

      // Test read permission
      try {
        await sheets.spreadsheets.get({ spreadsheetId: sheetId });
        permissions.canRead = true;
      } catch (readError) {
        errors.push('Read permission denied');
      }

      // Test write permission
      try {
        const testRange = 'Appointments!Z1';
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: testRange,
          valueInputOption: 'RAW',
          requestBody: {
            values: [['test']],
          },
        });
        
        // Clean up test data
        await sheets.spreadsheets.values.clear({
          spreadsheetId: sheetId,
          range: testRange,
        });
        
        permissions.canWrite = true;
      } catch (writeError) {
        errors.push('Write permission denied');
      }

      // Check sharing permissions
      try {
        const filePermissions = await drive.permissions.list({
          fileId: sheetId,
          fields: 'permissions(id,role,emailAddress)',
        });
        
        permissions.canShare = true;
        details.currentPermissions = filePermissions.data.permissions;
      } catch (shareError) {
        warnings.push('Cannot check sharing permissions');
      }

      details.permissions = permissions;

      if (!permissions.canRead) {
        errors.push('Read access is required');
      }

      if (!permissions.canWrite) {
        errors.push('Write access is required');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        details,
      };
    } catch (error: any) {
      return {
        isValid: false,
        errors: [`Permission verification failed: ${error.message}`],
        warnings,
        details,
      };
    }
  }

  /**
   * Test data operations (read, write, update)
   */
  async testDataOperations(organizationId: string, sheetId: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const details: any = {};

    try {
      await this.setOrgCredentials(organizationId);

      const sheets = google.sheets({ version: 'v4', auth: this.oauth2Client });
      const testRange = 'Appointments!A2:K2';
      
      // Test data
      const testData = [
        'TEST-001',
        'Test Patient',
        '+1234567890',
        'Dr. Test',
        new Date().toLocaleDateString(),
        '10:00 AM',
        '30 min',
        'Scheduled',
        'Test appointment',
        new Date().toISOString(),
        new Date().toISOString(),
      ];

      // Test write operation
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: testRange,
        valueInputOption: 'RAW',
        requestBody: {
          values: [testData],
        },
      });
      details.writeTest = 'success';

      // Test read operation
      const readResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: testRange,
      });
      details.readTest = readResponse.data.values ? 'success' : 'failed';

      // Test update operation
      testData[7] = 'Confirmed'; // Update status
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: testRange,
        valueInputOption: 'RAW',
        requestBody: {
          values: [testData],
        },
      });
      details.updateTest = 'success';

      // Clean up test data
      await sheets.spreadsheets.values.clear({
        spreadsheetId: sheetId,
        range: testRange,
      });
      details.cleanupTest = 'success';

      details.message = 'All data operations tested successfully';

      return {
        isValid: true,
        errors,
        warnings,
        details,
      };
    } catch (error: any) {
      return {
        isValid: false,
        errors: [`Data operations test failed: ${error.message}`],
        warnings,
        details,
      };
    }
  }

  /**
   * Activate sync service
   */
  async activateSyncService(organizationId: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const details: any = {};

    try {
      // Update organization configuration
      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          googleSheetsSyncEnabled: true,
          googleSheetsSyncFrequency: 15, // minutes
          setupProgress: {
            googleSheetsSetupComplete: true,
            googleSheetsSetupCompletedAt: new Date().toISOString(),
          },
        },
      });

      details.syncEnabled = true;
      details.syncFrequency = '15 minutes';
      details.message = 'Sync service activated successfully';

      return {
        isValid: true,
        errors,
        warnings,
        details,
      };
    } catch (error: any) {
      return {
        isValid: false,
        errors: [`Sync activation failed: ${error.message}`],
        warnings,
        details,
      };
    }
  }

  /**
   * Validate complete Google Sheets setup
   */
  async validateCompleteSetup(organizationId: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const details: any = {};

    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        errors.push('Organization not found');
        return { isValid: false, errors, warnings, details };
      }

      const tokens = organization.googleSheetsTokens as any;

      if (!tokens?.accessToken) errors.push('Google authorization not complete');
      if (!organization.googleSheetsId) errors.push('Google Sheet not selected or created');
      if (!organization.googleSheetsSyncEnabled) warnings.push('Sync service not activated');

      details.setupComplete = errors.length === 0;
      details.configurations = {
        authorized: !!tokens?.accessToken,
        sheetConfigured: !!organization.googleSheetsId,
        syncEnabled: organization.googleSheetsSyncEnabled,
      };

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        details,
      };
    } catch (error: any) {
      return {
        isValid: false,
        errors: [`Setup validation error: ${error.message}`],
        warnings,
        details,
      };
    }
  }

  /**
   * Set OAuth credentials from organization data
   */
  private async setOrgCredentials(organizationId: string): Promise<void> {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    const tokens = organization.googleSheetsTokens as any;

    if (!tokens?.accessToken) {
      throw new Error('Google authorization required');
    }

    this.oauth2Client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expiry_date: tokens.expiryDate,
    });
  }
}

export default new GoogleSheetsIntegrationService();
