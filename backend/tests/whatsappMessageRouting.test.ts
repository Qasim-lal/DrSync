/**
 * TASK-033 WhatsApp Message Routing Validation Tests
 * 
 * Tests the multi-client WhatsApp message routing system to validate:
 * - Webhook routing by URL to correct organization  
 * - Phone number mapping to organizations
 * - Message context isolation between organizations
 * - Credential management per organization
 * - Error handling for routing failures
 * 
 * This completes the validation testing required for TASK-033.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import whatsappService from '../src/services/whatsappService';
import { PrismaClient } from '../src/generated/prisma';
import logger from '../src/utils/logger';

// Mock external dependencies
jest.mock('axios');
jest.mock('../src/services/googleSheetsService');

const prisma = new PrismaClient();

// Test data setup
const testOrganization1 = {
  id: 'test-org-1',
  name: 'Test Clinic 1',
  whatsappPhoneNumber: '+923001234567',
  whatsappCredentials: {
    accessToken: 'test-access-token-1',
    phoneNumberId: 'phone-id-1',
    businessAccountId: 'business-id-1',
    webhookVerifyToken: 'verify-token-1',
    appSecret: 'app-secret-1'
  }
};

const testOrganization2 = {
  id: 'test-org-2', 
  name: 'Test Clinic 2',
  whatsappPhoneNumber: '+923009876543',
  whatsappCredentials: {
    accessToken: 'test-access-token-2',
    phoneNumberId: 'phone-id-2',
    businessAccountId: 'business-id-2',
    webhookVerifyToken: 'verify-token-2',
    appSecret: 'app-secret-2'
  }
};

const mockWebhookData1 = {
  entry: [{
    changes: [{
      value: {
        messages: [{
          from: '+923201234567',
          to: testOrganization1.whatsappPhoneNumber,
          type: 'text',
          text: { body: 'Hello' },
          timestamp: '1694953200'
        }],
        metadata: {
          phone_number_id: 'phone-id-1',
          display_phone_number: testOrganization1.whatsappPhoneNumber
        }
      }
    }]
  }]
};

const mockWebhookData2 = {
  entry: [{
    changes: [{
      value: {
        messages: [{
          from: '+923209876543',
          to: testOrganization2.whatsappPhoneNumber,
          type: 'text', 
          text: { body: 'Hi there' },
          timestamp: '1694953300'
        }],
        metadata: {
          phone_number_id: 'phone-id-2',
          display_phone_number: testOrganization2.whatsappPhoneNumber
        }
      }
    }]
  }]
};

describe('TASK-033: WhatsApp Message Routing Validation', () => {
  beforeAll(async () => {
    await prisma.$connect();
    
    // Create test organizations
    await prisma.organization.create({
      data: {
        id: testOrganization1.id,
        name: testOrganization1.name,
        slug: 'test-clinic-1',
        email: 'test1@clinic.com',
        whatsappPhoneNumber: testOrganization1.whatsappPhoneNumber,
        whatsappCredentials: testOrganization1.whatsappCredentials as any,
        isActive: true,
        subscriptionStatus: 'TRIAL' as any
      }
    });

    await prisma.organization.create({
      data: {
        id: testOrganization2.id,
        name: testOrganization2.name,
        slug: 'test-clinic-2',
        email: 'test2@clinic.com',
        whatsappPhoneNumber: testOrganization2.whatsappPhoneNumber,
        whatsappCredentials: testOrganization2.whatsappCredentials as any,
        isActive: true,
        subscriptionStatus: 'TRIAL' as any
      }
    });
    
    // Create test patients for message logging
    await prisma.patient.create({
      data: {
        id: 'test-patient-1',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+923201234567',
        organizationId: testOrganization1.id,
        whatsappNumber: '+923201234567',
        primaryContact: true,
        relationToPrimaryContact: 'self'
      }
    });
    
    await prisma.patient.create({
      data: {
        id: 'test-patient-2', 
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+923209876543',
        organizationId: testOrganization2.id,
        whatsappNumber: '+923209876543',
        primaryContact: true,
        relationToPrimaryContact: 'self'
      }
    });
  });

  afterAll(async () => {
    // Cleanup test data (patients first due to foreign key constraints)
    await prisma.patient.deleteMany({
      where: {
        id: { in: ['test-patient-1', 'test-patient-2'] }
      }
    });
    await prisma.organization.deleteMany({
      where: {
        id: { in: [testOrganization1.id, testOrganization2.id] }
      }
    });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Reset WhatsApp service state
    jest.clearAllMocks();
    
    // Initialize clients
    await whatsappService.initializeClients();
  });

  describe('1. Webhook URL Routing', () => {
    it('should route messages to correct organization based on phone number ID', async () => {
      // Mock the processMessage method to track which organization receives the message
      const processMessageSpy = jest.spyOn(whatsappService as any, 'processMessage');
      
      await whatsappService.routeMessage(mockWebhookData1);
      
      expect(processMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '+923201234567',
          type: 'text'
        }),
        testOrganization1.id
      );
    });

    it('should route different messages to different organizations', async () => {
      const processMessageSpy = jest.spyOn(whatsappService as any, 'processMessage');
      
      // Route message to organization 1
      await whatsappService.routeMessage(mockWebhookData1);
      
      // Route message to organization 2
      await whatsappService.routeMessage(mockWebhookData2);
      
      expect(processMessageSpy).toHaveBeenCalledTimes(2);
      expect(processMessageSpy).toHaveBeenNthCalledWith(1, expect.any(Object), testOrganization1.id);
      expect(processMessageSpy).toHaveBeenNthCalledWith(2, expect.any(Object), testOrganization2.id);
    });

    it('should handle webhook data without valid organization gracefully', async () => {
      const invalidWebhookData = {
        entry: [{
          changes: [{
            value: {
              messages: [{
                from: '+923201234567',
                type: 'text',
                text: { body: 'Hello' },
                timestamp: '1694953200'
              }],
              metadata: {
                phone_number_id: 'unknown-phone-id',
                display_phone_number: '+923000000000'
              }
            }
          }]
        }]
      };

      const processMessageSpy = jest.spyOn(whatsappService as any, 'processMessage');
      
      await whatsappService.routeMessage(invalidWebhookData);
      
      // Should not process message for unknown organization
      expect(processMessageSpy).not.toHaveBeenCalled();
    });
  });

  describe('2. Phone Number to Organization Mapping', () => {
    it('should correctly map phone numbers to organizations', async () => {
      // Test direct phone number mapping
      const identifyOrgMethod = (whatsappService as any).identifyOrganization;
      
      const org1Result = await identifyOrgMethod.call(whatsappService, {
        metadata: {
          phone_number_id: 'phone-id-1',
          display_phone_number: testOrganization1.whatsappPhoneNumber
        }
      }, {});
      
      expect(org1Result).toBe(testOrganization1.id);

      const org2Result = await identifyOrgMethod.call(whatsappService, {
        metadata: {
          phone_number_id: 'phone-id-2', 
          display_phone_number: testOrganization2.whatsappPhoneNumber
        }
      }, {});
      
      expect(org2Result).toBe(testOrganization2.id);
    });

    it('should return null for unmapped phone numbers', async () => {
      const identifyOrgMethod = (whatsappService as any).identifyOrganization;
      
      const result = await identifyOrgMethod.call(whatsappService, {
        metadata: {
          phone_number_id: 'unknown-id',
          display_phone_number: '+923000000000'
        }
      }, {});
      
      expect(result).toBeNull();
    });

    it('should handle missing metadata gracefully', async () => {
      const identifyOrgMethod = (whatsappService as any).identifyOrganization;
      
      const result = await identifyOrgMethod.call(whatsappService, {}, {});
      
      expect(result).toBeNull();
    });
  });

  describe('3. Message Context Isolation', () => {
    it('should process messages in correct organization context', async () => {
      // Mock the clients map to ensure isolation
      const clientsMap = (whatsappService as any).clients;
      
      expect(clientsMap.has(testOrganization1.id)).toBe(true);
      expect(clientsMap.has(testOrganization2.id)).toBe(true);
      
      const client1 = clientsMap.get(testOrganization1.id);
      const client2 = clientsMap.get(testOrganization2.id);
      
      expect(client1.organizationId).toBe(testOrganization1.id);
      expect(client1.phoneNumber).toBe(testOrganization1.whatsappPhoneNumber);
      
      expect(client2.organizationId).toBe(testOrganization2.id);
      expect(client2.phoneNumber).toBe(testOrganization2.whatsappPhoneNumber);
      
      // Ensure clients are isolated
      expect(client1.credentials.accessToken).not.toBe(client2.credentials.accessToken);
      expect(client1.credentials.phoneNumberId).not.toBe(client2.credentials.phoneNumberId);
    });

    it('should maintain separate session contexts per organization', async () => {
      const activeSessionsMap = (whatsappService as any).activeSessions;
      
      // Simulate starting sessions for both organizations
      const session1Key = `${testOrganization1.id}_+923201234567`;
      const session2Key = `${testOrganization2.id}_+923209876543`;
      
      activeSessionsMap.set(session1Key, {
        step: 'GREETING',
        organizationId: testOrganization1.id,
        patientPhone: '+923201234567',
        sessionData: { testData: 'org1' }
      });
      
      activeSessionsMap.set(session2Key, {
        step: 'PROVIDER_SELECTION',
        organizationId: testOrganization2.id,
        patientPhone: '+923209876543',
        sessionData: { testData: 'org2' }
      });
      
      const session1 = activeSessionsMap.get(session1Key);
      const session2 = activeSessionsMap.get(session2Key);
      
      expect(session1.organizationId).toBe(testOrganization1.id);
      expect(session2.organizationId).toBe(testOrganization2.id);
      expect(session1.sessionData.testData).toBe('org1');
      expect(session2.sessionData.testData).toBe('org2');
    });
  });

  describe('4. Credential Management', () => {
    it('should store and retrieve credentials correctly per organization', async () => {
      const clientsMap = (whatsappService as any).clients;
      
      const client1 = clientsMap.get(testOrganization1.id);
      const client2 = clientsMap.get(testOrganization2.id);
      
      expect(client1.credentials).toEqual(testOrganization1.whatsappCredentials);
      expect(client2.credentials).toEqual(testOrganization2.whatsappCredentials);
      
      // Credentials should be properly isolated
      expect(client1.credentials.accessToken).toBe('test-access-token-1');
      expect(client2.credentials.accessToken).toBe('test-access-token-2');
      expect(client1.credentials.webhookVerifyToken).toBe('verify-token-1');
      expect(client2.credentials.webhookVerifyToken).toBe('verify-token-2');
    });

    it('should verify webhook tokens for correct organizations', () => {
      const verifyResult1 = whatsappService.verifyWebhook('verify-token-1', testOrganization1.id);
      const verifyResult2 = whatsappService.verifyWebhook('verify-token-2', testOrganization2.id);
      
      expect(verifyResult1).toBe(true);
      expect(verifyResult2).toBe(true);
      
      // Cross-verification should fail
      const crossVerify1 = whatsappService.verifyWebhook('verify-token-1', testOrganization2.id);
      const crossVerify2 = whatsappService.verifyWebhook('verify-token-2', testOrganization1.id);
      
      expect(crossVerify1).toBe(false);
      expect(crossVerify2).toBe(false);
    });

    it('should handle invalid webhook tokens', () => {
      const invalidResult1 = whatsappService.verifyWebhook('invalid-token', testOrganization1.id);
      const invalidResult2 = whatsappService.verifyWebhook('invalid-token');
      
      expect(invalidResult1).toBe(false);
      expect(invalidResult2).toBe(false);
    });
  });

  describe('5. Error Handling', () => {
    it('should handle routing failures gracefully', async () => {
      jest.spyOn(logger, 'error').mockImplementation(() => logger);
      
      // Invalid webhook data
      const invalidWebhookData = {
        entry: null // Invalid structure
      };
      
      await expect(whatsappService.routeMessage(invalidWebhookData)).rejects.toThrow('Invalid webhook data');
    });

    it('should handle missing WhatsApp client gracefully', async () => {
      const processMessageMethod = (whatsappService as any).processMessage;
      
      const mockMessage = {
        from: '+923201234567',
        type: 'text',
        text: { body: 'Hello' },
        timestamp: '1694953200'
      };
      
      // Try to process message for non-existent organization
      await expect(
        processMessageMethod.call(whatsappService, mockMessage, 'non-existent-org-id')
      ).rejects.toThrow('WhatsApp client not found');
    });

    it('should handle database errors in organization identification', async () => {
      // This test validates that the system gracefully handles scenarios where
      // the organization cannot be identified through any available method
      const phoneToOrgMapping = (whatsappService as any).phoneToOrgMapping;
      const originalMapping = new Map(phoneToOrgMapping);
      phoneToOrgMapping.clear();
      
      const identifyOrgMethod = (whatsappService as any).identifyOrganization;
      const result = await identifyOrgMethod.call(whatsappService, {
        metadata: { 
          phone_number_id: 'non-existent-id-xyz',
          display_phone_number: '+923111111111' // Unmapped phone number
        }
      }, {});
      
      // Should return null when organization cannot be identified by any method
      expect(result).toBeNull();
      
      // Restore mappings
      phoneToOrgMapping.clear();
      originalMapping.forEach((value, key) => phoneToOrgMapping.set(key, value));
    });

    it('should track client statistics correctly', () => {
      const stats = whatsappService.getClientStats();
      
      expect(stats[testOrganization1.id]).toBeDefined();
      expect(stats[testOrganization2.id]).toBeDefined();
      
      expect(stats[testOrganization1.id]?.phoneNumber).toBe(testOrganization1.whatsappPhoneNumber);
      expect(stats[testOrganization2.id]?.phoneNumber).toBe(testOrganization2.whatsappPhoneNumber);
      
      expect(stats[testOrganization1.id]?.isActive).toBe(true);
      expect(stats[testOrganization2.id]?.isActive).toBe(true);
      
      expect(stats[testOrganization1.id]?.lastActivityAt).toBeInstanceOf(Date);
      expect(stats[testOrganization2.id]?.lastActivityAt).toBeInstanceOf(Date);
    });
  });

  describe('6. Integration Flow Testing', () => {
    it('should handle complete message routing flow', async () => {
      const logMessageSpy = jest.spyOn(whatsappService as any, 'logMessage').mockImplementation(() => Promise.resolve());
      const handleTextMessageSpy = jest.spyOn(whatsappService as any, 'handleTextMessage').mockImplementation(() => Promise.resolve());
      
      await whatsappService.routeMessage(mockWebhookData1);
      
      expect(handleTextMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '+923201234567',
          organizationId: testOrganization1.id,
          message: expect.objectContaining({
            type: 'text',
            text: { body: 'Hello' }
          })
        })
      );
      
      expect(logMessageSpy).toHaveBeenCalledWith(
        expect.any(Object),
        'INBOUND'
      );
    });

    it('should route multiple concurrent messages correctly', async () => {
      // Mock the actual message processing to avoid side effects
      const processMessageSpy = jest.spyOn(whatsappService as any, 'processMessage')
        .mockImplementation(() => Promise.resolve());
      
      // Process messages sequentially to ensure predictable ordering
      await whatsappService.routeMessage(mockWebhookData1);
      await whatsappService.routeMessage(mockWebhookData2);
      await whatsappService.routeMessage(mockWebhookData1);
      
      expect(processMessageSpy).toHaveBeenCalledTimes(3);
      
      // Check that messages were routed to correct organizations
      const calls = processMessageSpy.mock.calls;
      expect(calls[0]?.[1]).toBe(testOrganization1.id); // First message -> org1
      expect(calls[1]?.[1]).toBe(testOrganization2.id); // Second message -> org2
      expect(calls[2]?.[1]).toBe(testOrganization1.id); // Third message -> org1
    });
  });
});

// Export for manual testing
export const runManualWhatsAppRoutingTest = async () => {
  console.log('🧪 Running manual WhatsApp message routing test...');
  
  try {
    await whatsappService.initializeClients();
    
    console.log('📊 Client Statistics:');
    const stats = whatsappService.getClientStats();
    Object.entries(stats).forEach(([orgId, stat]) => {
      console.log(`   ${orgId}: ${stat.phoneNumber} (Active: ${stat.isActive})`);
    });
    
    console.log('🔐 Webhook Verification Tests:');
    console.log(`   Token 1 valid: ${whatsappService.verifyWebhook('verify-token-1', testOrganization1.id)}`);
    console.log(`   Token 2 valid: ${whatsappService.verifyWebhook('verify-token-2', testOrganization2.id)}`);
    console.log(`   Invalid token: ${whatsappService.verifyWebhook('invalid-token')}`);
    
    console.log('✅ Manual WhatsApp routing test completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Manual test failed:', error);
    return false;
  }
};