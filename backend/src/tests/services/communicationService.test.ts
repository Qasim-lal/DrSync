/**
 * Communication Service Tests - TASK-038D
 * 
 * Tests for:
 * - Email template management (SUBTASK-038D-002)
 * - Broadcast communications (SUBTASK-038D-004)
 * - Communication statistics
 */

// Mock Prisma client before importing the service
jest.mock('../../services/prisma', () => {
  const mockPrisma = {
    emailTemplate: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    communicationLog: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    supportTicket: {
      findUnique: jest.fn(),
    },
  };
  
  return {
    getPrismaClient: jest.fn(() => mockPrisma),
    __mockPrisma: mockPrisma,
  };
});

import { communicationService } from '../../services/communicationService';
const { __mockPrisma: mockPrisma } = jest.requireMock('../../services/prisma');

describe('CommunicationService - Email Templates (SUBTASK-038D-002)', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createEmailTemplate', () => {
    it('should create a new email template with body field', async () => {
      const templateData = {
        name: 'Welcome Email',
        subject: 'Welcome to DrSync',
        body: '<h1>Welcome {{organizationName}}</h1>',
        category: 'ONBOARDING',
        variables: ['organizationName'],
        createdBy: 'admin-123',
      };

      const mockTemplate = {
        id: 'template-123',
        ...templateData,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.emailTemplate.create.mockResolvedValue(mockTemplate);

      const result = await communicationService.createEmailTemplate(templateData);

      expect(mockPrisma.emailTemplate.create).toHaveBeenCalledWith({
        data: {
          name: templateData.name,
          subject: templateData.subject,
          body: templateData.body,
          category: templateData.category,
          variables: templateData.variables,
          createdBy: templateData.createdBy,
          isActive: true,
        },
      });

      expect(result).toEqual(mockTemplate);
    });
  });

  describe('updateEmailTemplate', () => {
    it('should update email template body field', async () => {
      const templateId = 'template-123';
      const updateData = {
        body: '<h1>Updated content</h1>',
        isActive: false,
      };

      const mockUpdatedTemplate = {
        id: templateId,
        name: 'Welcome Email',
        subject: 'Welcome',
        body: updateData.body,
        category: 'ONBOARDING',
        isActive: updateData.isActive,
      };

      mockPrisma.emailTemplate.update.mockResolvedValue(mockUpdatedTemplate);

      const result = await communicationService.updateEmailTemplate(templateId, updateData);

      expect(mockPrisma.emailTemplate.update).toHaveBeenCalledWith({
        where: { id: templateId },
        data: {
          body: updateData.body,
          isActive: updateData.isActive,
        },
      });

      expect(result.body).toBe(updateData.body);
    });
  });

  describe('renderTemplate', () => {
    it('should replace variables in both subject and body', () => {
      const template = {
        subject: 'Welcome {{organizationName}}',
        body: '<h1>Hello {{organizationName}}</h1><p>Your email: {{email}}</p>',
      };

      const variables = {
        organizationName: 'Test Clinic',
        email: 'test@clinic.com',
      };

      const result = communicationService.renderTemplate(template, variables);

      expect(result.subject).toBe('Welcome Test Clinic');
      expect(result.body).toBe('<h1>Hello Test Clinic</h1><p>Your email: test@clinic.com</p>');
    });
  });

  describe('listEmailTemplates', () => {
    it('should list email templates with pagination', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          name: 'Template 1',
          subject: 'Subject 1',
          body: 'Body 1',
          category: 'ONBOARDING',
          isActive: true,
        },
      ];

      mockPrisma.emailTemplate.findMany.mockResolvedValue(mockTemplates);
      mockPrisma.emailTemplate.count.mockResolvedValue(1);

      const result = await communicationService.listEmailTemplates({
        page: 1,
        limit: 10,
      });

      expect(result.templates).toEqual(mockTemplates);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });
  });
});

describe('CommunicationService - Broadcast Communications (SUBTASK-038D-004)', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendBroadcast', () => {
    it('should send broadcast to ALL organizations', async () => {
      const mockOrgs = [
        { id: 'org-1' },
        { id: 'org-2' },
        { id: 'org-3' },
      ];

      mockPrisma.organization.findMany.mockResolvedValue(mockOrgs);

      const mockLog = {
        id: 'log-123',
        type: 'BROADCAST',
        subject: 'System Update',
        message: 'System will be updated tonight',
        channel: 'EMAIL',
        recipientType: 'ALL',
        recipientIds: ['org-1', 'org-2', 'org-3'],
        recipientCount: 3,
        status: 'PENDING',
      };

      mockPrisma.communicationLog.create.mockResolvedValue(mockLog);
      mockPrisma.communicationLog.update.mockResolvedValue({
        ...mockLog,
        status: 'SENT',
        deliveredCount: 3,
      });

      const result = await communicationService.sendBroadcast({
        recipientType: 'ALL',
        subject: 'System Update',
        message: 'System will be updated tonight',
      });

      expect(mockPrisma.organization.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        select: { id: true },
      });

      expect(mockPrisma.communicationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'BROADCAST',
          subject: 'System Update',
          message: 'System will be updated tonight',
          recipientType: 'ALL',
          recipientIds: ['org-1', 'org-2', 'org-3'],
          recipientCount: 3,
        }),
      });

      expect(result.recipientCount).toBe(3);
      expect(result.status).toBe('SENT');
    });

    it('should send broadcast to SPECIFIC organizations', async () => {
      const mockLog = {
        id: 'log-123',
        type: 'NOTIFICATION',
        subject: 'Important Update',
        message: 'Your subscription is expiring',
        channel: 'EMAIL',
        recipientType: 'SPECIFIC',
        recipientIds: ['org-1', 'org-2'],
        recipientCount: 2,
        status: 'PENDING',
      };

      mockPrisma.communicationLog.create.mockResolvedValue(mockLog);
      mockPrisma.communicationLog.update.mockResolvedValue({
        ...mockLog,
        status: 'SENT',
        deliveredCount: 2,
      });

      const result = await communicationService.sendBroadcast({
        recipientType: 'SPECIFIC',
        recipientIds: ['org-1', 'org-2'],
        subject: 'Important Update',
        message: 'Your subscription is expiring',
        type: 'NOTIFICATION',
      });

      expect(mockPrisma.communicationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          recipientType: 'SPECIFIC',
          recipientIds: ['org-1', 'org-2'],
          recipientCount: 2,
        }),
      });

      expect(result.recipientCount).toBe(2);
    });

    it('should schedule broadcast for later', async () => {
      const scheduledDate = new Date('2024-12-31T10:00:00Z');
      const mockOrgs = [{ id: 'org-1' }];

      mockPrisma.organization.findMany.mockResolvedValue(mockOrgs);

      const mockLog = {
        id: 'log-123',
        type: 'ANNOUNCEMENT',
        subject: 'Scheduled Maintenance',
        message: 'We will perform maintenance',
        channel: 'EMAIL',
        recipientType: 'ALL',
        recipientIds: ['org-1'],
        recipientCount: 1,
        scheduledFor: scheduledDate,
        status: 'SCHEDULED',
      };

      mockPrisma.communicationLog.create.mockResolvedValue(mockLog);

      const result = await communicationService.sendBroadcast({
        recipientType: 'ALL',
        subject: 'Scheduled Maintenance',
        message: 'We will perform maintenance',
        type: 'ANNOUNCEMENT',
        scheduledFor: scheduledDate,
      });

      expect(mockPrisma.communicationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          scheduledFor: scheduledDate,
          status: 'SCHEDULED',
        }),
      });

      expect(result.status).toBe('SCHEDULED');
      expect(result.scheduledFor).toEqual(scheduledDate);
    });

    it('should use email template for broadcast', async () => {
      const mockTemplate = {
        id: 'template-123',
        name: 'System Alert',
        subject: 'Alert for {{organizationName}}',
        body: 'Important message: {{message}}',
        category: 'SYSTEM_ALERT',
      };

      const mockOrgs = [{ id: 'org-1' }];

      mockPrisma.emailTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockPrisma.organization.findMany.mockResolvedValue(mockOrgs);

      const mockLog = {
        id: 'log-123',
        templateId: 'template-123',
        recipientCount: 1,
      };

      mockPrisma.communicationLog.create.mockResolvedValue(mockLog);
      mockPrisma.communicationLog.update.mockResolvedValue({
        ...mockLog,
        status: 'SENT',
      });

      await communicationService.sendBroadcast({
        recipientType: 'ALL',
        templateId: 'template-123',
        message: 'Test message',
      });

      expect(mockPrisma.emailTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: 'template-123' },
      });
    });
  });

  describe('sendNotification', () => {
    it('should send notification to single organization', async () => {
      const mockOrg = {
        id: 'org-1',
        email: 'org@example.com',
        name: 'Test Clinic',
      };

      mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

      const mockLog = {
        id: 'log-123',
        recipientCount: 1,
      };

      mockPrisma.communicationLog.create.mockResolvedValue(mockLog);
      mockPrisma.communicationLog.update.mockResolvedValue({
        ...mockLog,
        status: 'SENT',
      });

      await communicationService.sendNotification({
        organizationId: 'org-1',
        subject: 'Account Update',
        message: 'Your account has been updated',
      });

      expect(mockPrisma.organization.findUnique).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        select: { email: true, name: true },
      });
    });
  });

  describe('getCommunicationHistory', () => {
    it('should retrieve broadcast communication history', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          type: 'BROADCAST',
          subject: 'Update 1',
          message: 'Message 1',
          recipientCount: 10,
          status: 'SENT',
        },
      ];

      mockPrisma.communicationLog.findMany.mockResolvedValue(mockLogs);
      mockPrisma.communicationLog.count.mockResolvedValue(1);

      const result = await communicationService.getCommunicationHistory({
        type: 'BROADCAST',
        status: 'SENT',
        page: 1,
        limit: 20,
      });

      expect(result.logs).toEqual(mockLogs);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('getCommunicationStats', () => {
    it('should return broadcast communication statistics', async () => {
      mockPrisma.communicationLog.count.mockResolvedValue(50);
      mockPrisma.communicationLog.groupBy.mockResolvedValueOnce([
        { type: 'BROADCAST', _count: 30 },
        { type: 'ANNOUNCEMENT', _count: 20 },
      ]).mockResolvedValueOnce([
        { status: 'SENT', _count: 45 },
        { status: 'FAILED', _count: 5 },
      ]).mockResolvedValueOnce([
        { channel: 'EMAIL', _count: 40 },
        { channel: 'IN_APP', _count: 10 },
      ]);
      
      mockPrisma.communicationLog.aggregate
        .mockResolvedValueOnce({ _sum: { recipientCount: 500 } })
        .mockResolvedValueOnce({ _sum: { deliveredCount: 480 } });

      const result = await communicationService.getCommunicationStats(30);

      expect(result.totalBroadcasts).toBe(50);
      expect(result.totalRecipients).toBe(500);
      expect(result.totalDelivered).toBe(480);
      expect(result.deliveryRate).toBe(96);
      expect(result.byType).toEqual({
        BROADCAST: 30,
        ANNOUNCEMENT: 20,
      });
      expect(result.byChannel).toEqual({
        EMAIL: 40,
        IN_APP: 10,
      });
    });
  });
});
