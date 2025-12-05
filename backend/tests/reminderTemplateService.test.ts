/**
 * Reminder Template Service Tests - TASK-042
 * 
 * Tests the template generation system for automated reminders and follow-ups.
 * Covers all 12 bilingual templates, variable substitution, and formatting.
 * 
 * @version 1.0
 * @date December 4, 2025
 */

import reminderTemplateService from '../src/services/reminderTemplateService';
import { ReminderType } from '@prisma/client';

describe('ReminderTemplateService - TASK-042 Unit Tests', () => {
  // Test data
  const testData = {
    patientName: 'Ahmed Khan',
    doctorName: 'Dr. Sarah Wilson',
    clinicName: 'City Medical Center',
    appointmentDate: new Date('2025-12-05T10:00:00Z'),
    appointmentTime: '10:00 AM',
  };

  describe('1. Template Loading', () => {
    test('TEST-001: Should have templates for all 6 reminder types', () => {
      const reminderTypes = [
        ReminderType.REMINDER_24H,
        ReminderType.REMINDER_2H,
        ReminderType.REMINDER_30MIN,
        ReminderType.FOLLOWUP_SAME_DAY,
        ReminderType.FOLLOWUP_NEXT_DAY,
        ReminderType.NO_SHOW_FOLLOWUP,
      ];

      reminderTypes.forEach(type => {
        const templates = reminderTemplateService.getAvailableTemplates(type);
        expect(templates.length).toBeGreaterThanOrEqual(2); // English + Urdu
      });
    });

    test('TEST-002: Should have both English and Urdu for each type', () => {
      const reminderTypes = [
        ReminderType.REMINDER_24H,
        ReminderType.REMINDER_2H,
        ReminderType.REMINDER_30MIN,
        ReminderType.FOLLOWUP_SAME_DAY,
        ReminderType.FOLLOWUP_NEXT_DAY,
        ReminderType.NO_SHOW_FOLLOWUP,
      ];

      reminderTypes.forEach(type => {
        const templates = reminderTemplateService.getAvailableTemplates(type);
        const hasEnglish = templates.some(t => t.language === 'en');
        const hasUrdu = templates.some(t => t.language === 'ur');

        expect(hasEnglish).toBe(true);
        expect(hasUrdu).toBe(true);
      });
    });

    test('TEST-003: Should generate preview messages for all types', () => {
      const reminderTypes = [
        ReminderType.REMINDER_24H,
        ReminderType.REMINDER_2H,
        ReminderType.REMINDER_30MIN,
        ReminderType.FOLLOWUP_SAME_DAY,
        ReminderType.FOLLOWUP_NEXT_DAY,
        ReminderType.NO_SHOW_FOLLOWUP,
      ];

      reminderTypes.forEach(type => {
        const englishPreview = reminderTemplateService.previewTemplate(type, 'en');
        const urduPreview = reminderTemplateService.previewTemplate(type, 'ur');

        expect(englishPreview).toBeDefined();
        expect(urduPreview).toBeDefined();
        expect(englishPreview.length).toBeGreaterThan(0);
        expect(urduPreview.length).toBeGreaterThan(0);
      });
    });
  });

  describe('2. Template Retrieval', () => {
    test('TEST-004: Should retrieve templates by type', () => {
      const templates = reminderTemplateService.getAvailableTemplates(
        ReminderType.REMINDER_24H
      );

      expect(templates.length).toBeGreaterThanOrEqual(2);
      expect(templates.every(t => t.type === ReminderType.REMINDER_24H)).toBe(true);
    });

    test('TEST-005: Should preview template for each language', () => {
      const englishPreview = reminderTemplateService.previewTemplate(
        ReminderType.REMINDER_24H,
        'en'
      );

      const urduPreview = reminderTemplateService.previewTemplate(
        ReminderType.REMINDER_24H,
        'ur'
      );

      expect(englishPreview).toBeDefined();
      expect(urduPreview).toBeDefined();
      expect(englishPreview).not.toBe(urduPreview);
    });

    test('TEST-006: Should generate different previews for different types', () => {
      const reminder24h = reminderTemplateService.previewTemplate(
        ReminderType.REMINDER_24H,
        'en'
      );

      const followUp = reminderTemplateService.previewTemplate(
        ReminderType.FOLLOWUP_SAME_DAY,
        'en'
      );

      expect(reminder24h).not.toBe(followUp);
    });
  });

  describe('3. Variable Substitution - English Templates', () => {
    test('TEST-007: Should replace all variables in 24-hour reminder', () => {
      const message = reminderTemplateService.generateMessage(
        ReminderType.REMINDER_24H,
        'en',
        testData
      );

      expect(message).toContain('Ahmed Khan');
      expect(message).toContain('Dr. Sarah Wilson');
      expect(message).toContain('City Medical Center');
      expect(message).toContain('December 5, 2025');
      expect(message).toContain('10:00 AM');
      expect(message).not.toContain('{{');
      expect(message).not.toContain('}}');
    });

    test('TEST-008: Should replace all variables in 2-hour reminder', () => {
      const message = reminderTemplateService.generateMessage(
        ReminderType.REMINDER_2H,
        'en',
        testData
      );

      expect(message).toContain('Ahmed Khan');
      expect(message).toContain('Dr. Sarah Wilson');
      expect(message).toContain('10:00 AM');
      expect(message).not.toContain('{{');
    });

    test('TEST-009: Should replace all variables in 30-minute reminder', () => {
      const message = reminderTemplateService.generateMessage(
        ReminderType.REMINDER_30MIN,
        'en',
        testData
      );

      expect(message).toContain('Ahmed Khan');
      expect(message).toContain('Dr. Sarah Wilson');
      expect(message).toContain('10:00 AM');
      expect(message).not.toContain('{{');
    });

    test('TEST-010: Should replace all variables in same-day follow-up', () => {
      const message = reminderTemplateService.generateMessage(
        ReminderType.FOLLOWUP_SAME_DAY,
        'en',
        testData
      );

      expect(message).toContain('Ahmed Khan');
      expect(message).toContain('Dr. Sarah Wilson');
      expect(message).toContain('City Medical Center');
      expect(message).not.toContain('{{');
    });

    test('TEST-011: Should replace all variables in next-day follow-up', () => {
      const message = reminderTemplateService.generateMessage(
        ReminderType.FOLLOWUP_NEXT_DAY,
        'en',
        testData
      );

      expect(message).toContain('Ahmed Khan');
      expect(message).toContain('Dr. Sarah Wilson');
      expect(message).not.toContain('{{');
    });

    test('TEST-012: Should replace all variables in no-show follow-up', () => {
      const message = reminderTemplateService.generateMessage(
        ReminderType.NO_SHOW_FOLLOWUP,
        'en',
        testData
      );

      expect(message).toContain('Ahmed Khan');
      expect(message).toContain('Dr. Sarah Wilson');
      expect(message).toContain('City Medical Center');
      expect(message).not.toContain('{{');
    });
  });

  describe('4. Variable Substitution - Urdu Templates', () => {
    test('TEST-013: Should replace all variables in Urdu 24-hour reminder', () => {
      const message = reminderTemplateService.generateMessage(
        ReminderType.REMINDER_24H,
        'ur',
        testData
      );

      expect(message).toContain('Ahmed Khan');
      expect(message).toContain('Dr. Sarah Wilson');
      expect(message).toContain('City Medical Center');
      expect(message).not.toContain('{{');
      // Urdu text should be present
      expect(message).toMatch(/[\u0600-\u06FF]/); // Arabic/Urdu Unicode range
    });

    test('TEST-014: Should replace all variables in Urdu 2-hour reminder', () => {
      const message = reminderTemplateService.generateMessage(
        ReminderType.REMINDER_2H,
        'ur',
        testData
      );

      expect(message).toContain('Ahmed Khan');
      expect(message).not.toContain('{{');
      expect(message).toMatch(/[\u0600-\u06FF]/);
    });

    test('TEST-015: Should replace all variables in Urdu follow-ups', () => {
      const types = [
        ReminderType.FOLLOWUP_SAME_DAY,
        ReminderType.FOLLOWUP_NEXT_DAY,
        ReminderType.NO_SHOW_FOLLOWUP,
      ];

      types.forEach(type => {
        const message = reminderTemplateService.generateMessage(
          type,
          'ur',
          testData
        );

        expect(message).toContain('Ahmed Khan');
        expect(message).not.toContain('{{');
        expect(message).toMatch(/[\u0600-\u06FF]/);
      });
    });
  });

  describe('5. Date and Time Formatting', () => {
    test('TEST-016: Should format date correctly in English', () => {
      const message = reminderTemplateService.generateMessage(
        ReminderType.REMINDER_24H,
        'en',
        testData
      );

      expect(message).toContain('December 5, 2025');
    });

    test('TEST-017: Should format time correctly', () => {
      const message = reminderTemplateService.generateMessage(
        ReminderType.REMINDER_24H,
        'en',
        testData
      );

      expect(message).toContain('10:00 AM');
    });

    test('TEST-018: Should handle different dates', () => {
      const differentDate = {
        ...testData,
        appointmentDate: new Date('2025-01-15T14:30:00Z'),
        appointmentTime: '2:30 PM',
      };

      const message = reminderTemplateService.generateMessage(
        ReminderType.REMINDER_24H,
        'en',
        differentDate
      );

      expect(message).toContain('January 15, 2025');
      expect(message).toContain('2:30 PM');
    });
  });

  describe('6. Missing Variable Handling', () => {
    test('TEST-019: Should handle missing optional variables gracefully', () => {
      const incompleteData = {
        patientName: 'Ahmed Khan',
        doctorName: 'Dr. Wilson',
        // Missing clinic name, date, time
      };

      const message = reminderTemplateService.generateMessage(
        ReminderType.REMINDER_24H,
        'en',
        incompleteData as any
      );

      expect(message).toContain('Ahmed Khan');
      expect(message).toContain('Dr. Wilson');
      // Should not crash, missing variables replaced with empty string or placeholder
    });

    test('TEST-020: Should handle completely empty data', () => {
      const emptyData = {};

      const message = reminderTemplateService.generateMessage(
        ReminderType.REMINDER_24H,
        'en',
        emptyData as any
      );

      // Should return a message (even if incomplete)
      expect(message).toBeDefined();
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });
  });

  describe('7. Special Characters and Escaping', () => {
    test('TEST-021: Should handle names with special characters', () => {
      const specialData = {
        ...testData,
        patientName: "O'Connor Ahmed",
        doctorName: "Dr. José García",
        clinicName: "City's Best Clinic & Hospital",
      };

      const message = reminderTemplateService.generateMessage(
        ReminderType.REMINDER_24H,
        'en',
        specialData
      );

      expect(message).toContain("O'Connor Ahmed");
      expect(message).toContain("Dr. José García");
      expect(message).toContain("City's Best Clinic & Hospital");
    });

    test('TEST-022: Should handle Urdu names', () => {
      const urduData = {
        ...testData,
        patientName: 'احمد خان',
        doctorName: 'ڈاکٹر سارہ',
      };

      const message = reminderTemplateService.generateMessage(
        ReminderType.REMINDER_24H,
        'ur',
        urduData
      );

      expect(message).toContain('احمد خان');
      expect(message).toContain('ڈاکٹر سارہ');
    });
  });

  describe('8. Message Length and Format', () => {
    test('TEST-023: All messages should be reasonable length for WhatsApp', () => {
      const types = [
        ReminderType.REMINDER_24H,
        ReminderType.REMINDER_2H,
        ReminderType.REMINDER_30MIN,
        ReminderType.FOLLOWUP_SAME_DAY,
        ReminderType.FOLLOWUP_NEXT_DAY,
        ReminderType.NO_SHOW_FOLLOWUP,
      ];

      types.forEach(type => {
        const message = reminderTemplateService.generateMessage(
          type,
          'en',
          testData
        );

        // WhatsApp message limit is 4096 characters
        expect(message.length).toBeLessThan(4096);
        // Should be substantial (not empty)
        expect(message.length).toBeGreaterThan(50);
      });
    });

    test('TEST-024: Messages should not have leading/trailing whitespace', () => {
      const message = reminderTemplateService.generateMessage(
        ReminderType.REMINDER_24H,
        'en',
        testData
      );

      expect(message).toBe(message.trim());
    });

    test('TEST-025: Messages should not have excessive line breaks', () => {
      const message = reminderTemplateService.generateMessage(
        ReminderType.REMINDER_24H,
        'en',
        testData
      );

      // Should not have more than 2 consecutive newlines
      expect(message).not.toMatch(/\n\n\n+/);
    });
  });


  describe('10. Batch Generation', () => {
    test('TEST-029: Should generate multiple messages efficiently', () => {
      const patients = [
        { patientName: 'Ahmed Khan', doctorName: 'Dr. Wilson', clinicName: 'Clinic A', appointmentDate: new Date(), appointmentTime: '10:00 AM' },
        { patientName: 'Fatima Ali', doctorName: 'Dr. Smith', clinicName: 'Clinic B', appointmentDate: new Date(), appointmentTime: '11:00 AM' },
        { patientName: 'Hassan Raza', doctorName: 'Dr. Johnson', clinicName: 'Clinic C', appointmentDate: new Date(), appointmentTime: '12:00 PM' },
      ];

      const startTime = Date.now();
      
      const messages = patients.map(patient =>
        reminderTemplateService.generateMessage(
          ReminderType.REMINDER_24H,
          'en',
          patient
        )
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(messages).toHaveLength(3);
      expect(duration).toBeLessThan(100); // Should be fast (<100ms for 3 messages)
      
      // Each message should be unique
      expect(new Set(messages).size).toBe(3);
    });
  });

  describe('11. Edge Cases', () => {
    test('TEST-030: Should handle very long names', () => {
      const longNameData = {
        ...testData,
        patientName: 'Muhammad Abdullah Ahmad Hassan Al-Rahman Khan Siddiqui',
        doctorName: 'Dr. Elizabeth Catherine Montgomery-Williams',
      };

      const message = reminderTemplateService.generateMessage(
        ReminderType.REMINDER_24H,
        'en',
        longNameData
      );

      expect(message).toContain(longNameData.patientName);
      expect(message).toContain(longNameData.doctorName);
    });

    test('TEST-031: Should handle dates far in the future', () => {
      const futureData = {
        ...testData,
        appointmentDate: new Date('2030-12-31T23:59:00Z'),
      };

      const message = reminderTemplateService.generateMessage(
        ReminderType.REMINDER_24H,
        'en',
        futureData
      );

      expect(message).toContain('December 31, 2030');
    });

    test('TEST-032: Should handle midnight and noon times', () => {
      const midnightData = {
        ...testData,
        appointmentTime: '12:00 AM',
      };

      const noonData = {
        ...testData,
        appointmentTime: '12:00 PM',
      };

      const midnightMessage = reminderTemplateService.generateMessage(
        ReminderType.REMINDER_24H,
        'en',
        midnightData
      );

      const noonMessage = reminderTemplateService.generateMessage(
        ReminderType.REMINDER_24H,
        'en',
        noonData
      );

      expect(midnightMessage).toContain('12:00 AM');
      expect(noonMessage).toContain('12:00 PM');
    });
  });
});
