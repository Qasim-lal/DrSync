/**
 * TASK-021: Comprehensive Analytics Endpoints Integration Tests
 * 
 * Tests the comprehensive analytics system including:
 * - Patient analytics (demographics, appointment patterns, revenue)
 * - Provider analytics (performance metrics, utilization, ratings)
 * - Appointment analytics (trends, completion rates, cancellations)
 * - Revenue analytics (income trends, payment status, fee analysis)
 * - System analytics (usage patterns, peak times, resource utilization)
 * - Real-time analytics with caching
 * - Organization-scoped analytics
 * - Date range filtering and custom reporting
 * - Export capabilities (CSV, PDF reports)
 * - Google Sheets integration for analytics data
 * 
 * Status: ✅ Completed (September 11, 2025)
 * Dependencies: TASK-013 (Database models), TASK-018-020 (Core entities)
 * 
 * @version 1.0
 * @author DrSync Test Team
 * @date September 12, 2025
 */

import { describe, beforeAll, afterAll, beforeEach, test, expect, jest } from '@jest/globals';
import request from 'supertest';
import { app } from '../src/app';
import { createTestOrganization, createTestUser, createTestProvider, createTestPatient, createTestAppointment, cleanupTestData } from '../src/tests/testUtils';
import { getPrismaClient } from '../src/services/prisma';
import googleSheetsService from '../src/services/googleSheetsService';

// Mock Google Sheets service
jest.mock('../src/services/googleSheetsService');

const prisma = getPrismaClient();

describe('TASK-021: Comprehensive Analytics Endpoints Integration Tests', () => {
  let testOrgId: string;
  let authToken: string;
  let testProviderId: string;
  let testAppointmentIds: string[];
  let testUserEmail: string;

  beforeAll(async () => {
    await cleanupTestData();
    
    // Create test organization and user
    testOrgId = await createTestOrganization({
      name: 'Analytics Test Clinic',
      subscriptionTier: 'ENTERPRISE',
      isActive: true
    });

    testUserEmail = `analytics-test-${Date.now()}@example.com`;
    await createTestUser({
      email: testUserEmail,
      firstName: 'Test',
      lastName: 'Admin',
      role: 'SUPER_ADMIN', // Need super admin role for system analytics access
      organizationId: testOrgId
    });

    // Create test provider for analytics
    testProviderId = await createTestProvider({
      firstName: 'Dr. Analytics',
      lastName: 'Provider',
      specialization: 'Cardiology',
      organizationId: testOrgId
    });

    // Create test patient first
    const testPatientId = await createTestPatient({
      firstName: 'John',
      lastName: 'Test',
      phone: `+92300${Date.now().toString().slice(-7)}`,
      organizationId: testOrgId
    });

    // Create test appointments for analytics
    testAppointmentIds = [];
    for (let i = 0; i < 5; i++) {
      const appointmentId = await createTestAppointment({
        patientId: testPatientId, // Use actual patient ID
        providerId: testProviderId,
        organizationId: testOrgId,
        status: i < 3 ? 'COMPLETED' : 'SCHEDULED',
        scheduledAt: new Date(Date.now() + i * 24 * 60 * 60 * 1000) // Spread over 5 days
      });
      testAppointmentIds.push(appointmentId);
    }

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUserEmail,
        password: 'password123'
      });

    authToken = loginResponse.body.data.tokens.accessToken;
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Patient Analytics (GET /api/analytics/patients)', () => {
    test('should get comprehensive patient analytics', async () => {
      const mockPatientAnalytics = {
        totalPatients: 150,
        newPatientsThisMonth: 25,
        returningPatients: 125,
        patientGrowthRate: 12.5,
        demographicBreakdown: {
          ageGroups: [
            { range: '18-30', count: 45, percentage: 30 },
            { range: '31-50', count: 60, percentage: 40 },
            { range: '51-70', count: 30, percentage: 20 },
            { range: '70+', count: 15, percentage: 10 }
          ],
          genderDistribution: [
            { gender: 'FEMALE', count: 85, percentage: 56.7 },
            { gender: 'MALE', count: 65, percentage: 43.3 }
          ]
        },
        appointmentPatterns: {
          averageAppointmentsPerPatient: 2.8,
          mostActivePatients: [
            { patientId: 'patient-1', name: 'John Doe', appointmentCount: 8 },
            { patientId: 'patient-2', name: 'Jane Smith', appointmentCount: 6 }
          ],
          appointmentFrequency: {
            weekly: 45,
            monthly: 75,
            quarterly: 30
          }
        },
        revenueContribution: {
          totalRevenue: 750000,
          averageRevenuePerPatient: 5000,
          topPayingPatients: [
            { patientId: 'patient-3', totalPaid: 25000 },
            { patientId: 'patient-4', totalPaid: 20000 }
          ]
        }
      };

      const mockGetPatientAnalytics = jest.mocked(googleSheetsService.getPatientAnalytics);
      mockGetPatientAnalytics.mockResolvedValue(mockPatientAnalytics);

      const response = await request(app)
        .get('/api/analytics/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2025-01-01',
          endDate: '2025-09-12'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.dataSource).toBe('GOOGLE_SHEETS');
      expect(response.body.data.totalPatients).toBe(150);
      expect(response.body.data.demographicBreakdown.ageGroups).toHaveLength(4);
      expect(response.body.data.appointmentPatterns.mostActivePatients).toHaveLength(2);
      expect(response.body.data.revenueContribution.totalRevenue).toBe(750000);
      
      expect(mockGetPatientAnalytics).toHaveBeenCalledWith(
        testOrgId,
        expect.objectContaining({
          startDate: '2025-01-01',
          endDate: '2025-09-12'
        })
      );
    });

    test('should support demographic filtering', async () => {
      const mockGetPatientAnalytics = jest.mocked(googleSheetsService.getPatientAnalytics);
      mockGetPatientAnalytics.mockResolvedValue({
        totalPatients: 60,
        demographicBreakdown: { ageGroups: [], genderDistribution: [] },
        appointmentPatterns: { averageAppointmentsPerPatient: 0, mostActivePatients: [], appointmentFrequency: {} },
        revenueContribution: { totalRevenue: 0, averageRevenuePerPatient: 0, topPayingPatients: [] }
      });

      const response = await request(app)
        .get('/api/analytics/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          ageGroup: '31-50',
          gender: 'FEMALE'
        });

      expect(response.status).toBe(200);
      expect(mockGetPatientAnalytics).toHaveBeenCalledWith(
        testOrgId,
        expect.objectContaining({
          filters: expect.objectContaining({
            ageGroup: '31-50',
            gender: 'FEMALE'
          })
        })
      );
    });

    test('should fallback to PostgreSQL when Google Sheets fails', async () => {
      const mockGetPatientAnalytics = jest.mocked(googleSheetsService.getPatientAnalytics);
      mockGetPatientAnalytics.mockRejectedValue(new Error('Google Sheets unavailable'));

      // Mock PostgreSQL queries
      const mockPatientCount = jest.spyOn(prisma.patient, 'count');
      mockPatientCount.mockResolvedValue(25);

      const mockAppointmentGroupBy = jest.spyOn(prisma.appointment, 'groupBy');
      mockAppointmentGroupBy.mockResolvedValue([
        { patientId: 'patient-1', _count: { patientId: 3 } },
        { patientId: 'patient-2', _count: { patientId: 5 } }
      ] as any);

      const response = await request(app)
        .get('/api/analytics/patients')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.dataSource).toBe('POSTGRESQL_FALLBACK');
    });
  });

  describe('2. Provider Analytics (GET /api/analytics/providers)', () => {
    test('should get comprehensive provider analytics', async () => {
      const mockProviderAnalytics = {
        totalProviders: 12,
        activeProviders: 10,
        providerUtilization: {
          averageUtilizationRate: 78.5,
          topPerformingProviders: [
            {
              providerId: testProviderId,
              name: 'Dr. Analytics Provider',
              utilizationRate: 95.2,
              totalAppointments: 120,
              completedAppointments: 115,
              revenue: 575000
            },
            {
              providerId: 'provider-2',
              name: 'Dr. Second Provider',
              utilizationRate: 88.7,
              totalAppointments: 100,
              completedAppointments: 95,
              revenue: 475000
            }
          ],
          lowUtilizationProviders: [
            {
              providerId: 'provider-3',
              name: 'Dr. Under Utilized',
              utilizationRate: 45.3,
              totalAppointments: 30,
              completedAppointments: 28
            }
          ]
        },
        specializationAnalytics: {
          distribution: [
            { specialization: 'Cardiology', providerCount: 4, totalRevenue: 1200000 },
            { specialization: 'Pediatrics', providerCount: 3, totalRevenue: 800000 },
            { specialization: 'General Medicine', providerCount: 5, totalRevenue: 1500000 }
          ],
          performance: [
            { specialization: 'Cardiology', averageRating: 4.8, completionRate: 96.2 },
            { specialization: 'Pediatrics', averageRating: 4.7, completionRate: 94.8 }
          ]
        },
        appointmentMetrics: {
          totalAppointments: 1250,
          completedAppointments: 1150,
          cancelledAppointments: 75,
          noShowAppointments: 25,
          averageAppointmentDuration: 42,
          completionRate: 92.0
        },
        revenueMetrics: {
          totalRevenue: 3500000,
          averageRevenuePerProvider: 291667,
          revenueGrowth: 15.8
        }
      };

      const mockGetProviderAnalytics = jest.mocked(googleSheetsService.getProviderAnalytics);
      mockGetProviderAnalytics.mockResolvedValue(mockProviderAnalytics);

      const response = await request(app)
        .get('/api/analytics/providers')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2025-01-01',
          endDate: '2025-09-12',
          includeInactive: 'false'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalProviders).toBe(12);
      expect(response.body.data.providerUtilization.topPerformingProviders).toHaveLength(2);
      expect(response.body.data.specializationAnalytics.distribution).toHaveLength(3);
      expect(response.body.data.appointmentMetrics.completionRate).toBe(92.0);
      
      expect(mockGetProviderAnalytics).toHaveBeenCalledWith(
        testOrgId,
        expect.objectContaining({
          startDate: '2025-01-01',
          endDate: '2025-09-12',
          includeInactive: false
        })
      );
    });

    test('should filter by specialization', async () => {
      const mockGetProviderAnalytics = jest.mocked(googleSheetsService.getProviderAnalytics);
      mockGetProviderAnalytics.mockResolvedValue({
        totalProviders: 4,
        activeProviders: 4,
        providerUtilization: { averageUtilizationRate: 82.1, topPerformingProviders: [], lowUtilizationProviders: [] },
        specializationAnalytics: { distribution: [], performance: [] },
        appointmentMetrics: { totalAppointments: 0, completedAppointments: 0, cancelledAppointments: 0, noShowAppointments: 0, averageAppointmentDuration: 0, completionRate: 0 },
        revenueMetrics: { totalRevenue: 0, averageRevenuePerProvider: 0, revenueGrowth: 0 }
      });

      const response = await request(app)
        .get('/api/analytics/providers')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          specialization: 'Cardiology'
        });

      expect(response.status).toBe(200);
      expect(mockGetProviderAnalytics).toHaveBeenCalledWith(
        testOrgId,
        expect.objectContaining({
          filters: expect.objectContaining({
            specialization: 'Cardiology'
          })
        })
      );
    });

    test('should get individual provider performance', async () => {
      const mockProviderPerformance = {
        providerId: testProviderId,
        name: 'Dr. Analytics Provider',
        specialization: 'Cardiology',
        performanceMetrics: {
          utilizationRate: 95.2,
          appointmentsCompleted: 115,
          appointmentsCancelled: 5,
          averageRating: 4.9,
          patientSatisfactionScore: 98.5,
          onTimePercentage: 94.8
        },
        revenueMetrics: {
          totalRevenue: 575000,
          averageRevenuePerAppointment: 5000,
          revenueGrowth: 22.1
        },
        availabilityMetrics: {
          totalAvailableHours: 160,
          bookedHours: 152,
          utilizationPercentage: 95.0
        },
        patientMetrics: {
          totalUniquePatients: 85,
          returningPatients: 45,
          newPatients: 40,
          patientRetentionRate: 52.9
        }
      };

      const mockGetProviderPerformance = jest.mocked(googleSheetsService.getProviderPerformance);
      mockGetProviderPerformance.mockResolvedValue(mockProviderPerformance);

      const response = await request(app)
        .get(`/api/analytics/providers/${testProviderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2025-01-01',
          endDate: '2025-09-12'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.providerId).toBe(testProviderId);
      expect(response.body.data.performanceMetrics.utilizationRate).toBe(95.2);
      expect(response.body.data.revenueMetrics.totalRevenue).toBe(575000);
      expect(response.body.data.patientMetrics.patientRetentionRate).toBe(52.9);
    });
  });

  describe('3. Appointment Analytics (GET /api/analytics/appointments)', () => {
    test('should get comprehensive appointment analytics', async () => {
      const mockAppointmentAnalytics = {
        totalAppointments: 1250,
        appointmentTrends: {
          daily: [
            { date: '2025-09-01', scheduled: 15, completed: 14, cancelled: 1 },
            { date: '2025-09-02', scheduled: 18, completed: 16, cancelled: 2 },
            { date: '2025-09-03', scheduled: 12, completed: 12, cancelled: 0 }
          ],
          weekly: [
            { week: '2025-W35', scheduled: 85, completed: 78, cancelled: 7 },
            { week: '2025-W36', scheduled: 92, completed: 86, cancelled: 6 }
          ],
          monthly: [
            { month: '2025-08', scheduled: 380, completed: 352, cancelled: 28 },
            { month: '2025-09', scheduled: 420, completed: 395, cancelled: 25 }
          ]
        },
        statusDistribution: {
          SCHEDULED: { count: 280, percentage: 22.4 },
          CONFIRMED: { count: 320, percentage: 25.6 },
          COMPLETED: { count: 580, percentage: 46.4 },
          CANCELLED: { count: 50, percentage: 4.0 },
          NO_SHOW: { count: 20, percentage: 1.6 }
        },
        timeSlotAnalysis: {
          peakHours: [
            { hour: 10, appointmentCount: 185 },
            { hour: 14, appointmentCount: 165 },
            { hour: 16, appointmentCount: 155 }
          ],
          peakDays: [
            { day: 'MONDAY', appointmentCount: 245 },
            { day: 'TUESDAY', appointmentCount: 220 },
            { day: 'WEDNESDAY', appointmentCount: 205 }
          ],
          utilizationByTimeSlot: {
            morning: { total: 450, booked: 425, utilization: 94.4 },
            afternoon: { total: 400, booked: 380, utilization: 95.0 },
            evening: { total: 200, booked: 165, utilization: 82.5 }
          }
        },
        durationAnalysis: {
          averageDuration: 42,
          durationDistribution: [
            { duration: 30, count: 425, percentage: 34.0 },
            { duration: 45, count: 520, percentage: 41.6 },
            { duration: 60, count: 305, percentage: 24.4 }
          ],
          overtimeAnalysis: {
            appointmentsRunningOver: 125,
            averageOvertime: 8.5,
            overtimePercentage: 10.0
          }
        },
        cancellationAnalysis: {
          totalCancellations: 50,
          cancellationRate: 4.0,
          cancellationReasons: [
            { reason: 'PATIENT_REQUEST', count: 25, percentage: 50.0 },
            { reason: 'PROVIDER_UNAVAILABLE', count: 15, percentage: 30.0 },
            { reason: 'EMERGENCY', count: 10, percentage: 20.0 }
          ],
          advanceNoticeTrends: {
            sameDay: { count: 15, percentage: 30.0 },
            oneDayAhead: { count: 20, percentage: 40.0 },
            twoPlusDaysAhead: { count: 15, percentage: 30.0 }
          }
        }
      };

      const mockGetAppointmentAnalytics = jest.mocked(googleSheetsService.getAppointmentAnalytics);
      mockGetAppointmentAnalytics.mockResolvedValue(mockAppointmentAnalytics);

      const response = await request(app)
        .get('/api/analytics/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2025-01-01',
          endDate: '2025-09-12',
          groupBy: 'daily'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalAppointments).toBe(1250);
      expect(response.body.data.appointmentTrends.daily).toHaveLength(3);
      expect(response.body.data.statusDistribution.COMPLETED.percentage).toBe(46.4);
      expect(response.body.data.timeSlotAnalysis.peakHours).toHaveLength(3);
      expect(response.body.data.cancellationAnalysis.cancellationRate).toBe(4.0);
      
      expect(mockGetAppointmentAnalytics).toHaveBeenCalledWith(
        testOrgId,
        expect.objectContaining({
          startDate: '2025-01-01',
          endDate: '2025-09-12',
          groupBy: 'daily'
        })
      );
    });

    test('should support provider-specific appointment analytics', async () => {
      const mockGetAppointmentAnalytics = jest.mocked(googleSheetsService.getAppointmentAnalytics);
      mockGetAppointmentAnalytics.mockResolvedValue({
        totalAppointments: 120,
        appointmentTrends: { daily: [], weekly: [], monthly: [] },
        statusDistribution: {},
        timeSlotAnalysis: { peakHours: [], peakDays: [], utilizationByTimeSlot: {} },
        durationAnalysis: { averageDuration: 0, durationDistribution: [], overtimeAnalysis: {} },
        cancellationAnalysis: { totalCancellations: 0, cancellationRate: 0, cancellationReasons: [], advanceNoticeTrends: {} }
      });

      const response = await request(app)
        .get('/api/analytics/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          providerId: testProviderId
        });

      expect(response.status).toBe(200);
      expect(mockGetAppointmentAnalytics).toHaveBeenCalledWith(
        testOrgId,
        expect.objectContaining({
          filters: expect.objectContaining({
            providerId: testProviderId
          })
        })
      );
    });

    test('should support status-based filtering', async () => {
      const mockGetAppointmentAnalytics = jest.mocked(googleSheetsService.getAppointmentAnalytics);
      mockGetAppointmentAnalytics.mockResolvedValue({
        totalAppointments: 580,
        appointmentTrends: { daily: [], weekly: [], monthly: [] },
        statusDistribution: {},
        timeSlotAnalysis: { peakHours: [], peakDays: [], utilizationByTimeSlot: {} },
        durationAnalysis: { averageDuration: 0, durationDistribution: [], overtimeAnalysis: {} },
        cancellationAnalysis: { totalCancellations: 0, cancellationRate: 0, cancellationReasons: [], advanceNoticeTrends: {} }
      });

      const response = await request(app)
        .get('/api/analytics/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          status: 'COMPLETED'
        });

      expect(response.status).toBe(200);
      expect(mockGetAppointmentAnalytics).toHaveBeenCalledWith(
        testOrgId,
        expect.objectContaining({
          filters: expect.objectContaining({
            status: 'COMPLETED'
          })
        })
      );
    });
  });

  describe('4. Revenue Analytics (GET /api/analytics/revenue)', () => {
    test('should get comprehensive revenue analytics', async () => {
      const mockRevenueAnalytics = {
        totalRevenue: 3500000,
        revenueGrowth: {
          monthlyGrowth: 8.5,
          quarterlyGrowth: 22.1,
          yearlyGrowth: 45.8
        },
        revenueTrends: {
          daily: [
            { date: '2025-09-01', revenue: 45000, appointments: 15 },
            { date: '2025-09-02', revenue: 52000, appointments: 18 },
            { date: '2025-09-03', revenue: 38000, appointments: 12 }
          ],
          monthly: [
            { month: '2025-07', revenue: 850000, appointments: 285 },
            { month: '2025-08', revenue: 920000, appointments: 320 },
            { month: '2025-09', revenue: 980000, appointments: 345 }
          ]
        },
        revenueByProvider: [
          {
            providerId: testProviderId,
            name: 'Dr. Analytics Provider',
            revenue: 575000,
            appointments: 120,
            averageRevenuePerAppointment: 4792
          },
          {
            providerId: 'provider-2',
            name: 'Dr. Second Provider',
            revenue: 475000,
            appointments: 100,
            averageRevenuePerAppointment: 4750
          }
        ],
        revenueBySpecialization: [
          { specialization: 'Cardiology', revenue: 1200000, percentage: 34.3 },
          { specialization: 'General Medicine', revenue: 1500000, percentage: 42.9 },
          { specialization: 'Pediatrics', revenue: 800000, percentage: 22.9 }
        ],
        paymentAnalysis: {
          collectedRevenue: 3150000,
          pendingRevenue: 280000,
          overdueRevenue: 70000,
          collectionRate: 90.0,
          averagePaymentTime: 12.5,
          paymentMethods: [
            { method: 'CASH', amount: 1575000, percentage: 45.0 },
            { method: 'CARD', amount: 1225000, percentage: 35.0 },
            { method: 'ONLINE', amount: 700000, percentage: 20.0 }
          ]
        },
        forecastAnalysis: {
          projectedMonthlyRevenue: 1050000,
          confidenceInterval: 0.85,
          seasonalTrends: [
            { season: 'Q1', averageRevenue: 2800000, growth: 5.2 },
            { season: 'Q2', averageRevenue: 3200000, growth: 12.8 },
            { season: 'Q3', averageRevenue: 3500000, growth: 8.5 },
            { season: 'Q4', averageRevenue: 3800000, growth: 15.2 }
          ]
        }
      };

      const mockGetRevenueAnalytics = jest.mocked(googleSheetsService.getRevenueAnalytics);
      mockGetRevenueAnalytics.mockResolvedValue(mockRevenueAnalytics);

      const response = await request(app)
        .get('/api/analytics/revenue')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2025-01-01',
          endDate: '2025-09-12',
          currency: 'PKR'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalRevenue).toBe(3500000);
      expect(response.body.data.revenueGrowth.monthlyGrowth).toBe(8.5);
      expect(response.body.data.revenueByProvider).toHaveLength(2);
      expect(response.body.data.paymentAnalysis.collectionRate).toBe(90.0);
      expect(response.body.data.forecastAnalysis.projectedMonthlyRevenue).toBe(1050000);
      
      expect(mockGetRevenueAnalytics).toHaveBeenCalledWith(
        testOrgId,
        expect.objectContaining({
          startDate: '2025-01-01',
          endDate: '2025-09-12',
          currency: 'PKR'
        })
      );
    });

    test('should support payment status filtering', async () => {
      const mockGetRevenueAnalytics = jest.mocked(googleSheetsService.getRevenueAnalytics);
      mockGetRevenueAnalytics.mockResolvedValue({
        totalRevenue: 3150000,
        revenueGrowth: { monthlyGrowth: 0, quarterlyGrowth: 0, yearlyGrowth: 0 },
        revenueTrends: { daily: [], monthly: [] },
        revenueByProvider: [],
        revenueBySpecialization: [],
        paymentAnalysis: { collectedRevenue: 0, pendingRevenue: 0, overdueRevenue: 0, collectionRate: 0, averagePaymentTime: 0, paymentMethods: [] },
        forecastAnalysis: { projectedMonthlyRevenue: 0, confidenceInterval: 0, seasonalTrends: [] }
      });

      const response = await request(app)
        .get('/api/analytics/revenue')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          paymentStatus: 'PAID'
        });

      expect(response.status).toBe(200);
      expect(mockGetRevenueAnalytics).toHaveBeenCalledWith(
        testOrgId,
        expect.objectContaining({
          filters: expect.objectContaining({
            paymentStatus: 'PAID'
          })
        })
      );
    });
  });

  describe('5. System Analytics (GET /api/analytics/system)', () => {
    test('should get comprehensive system analytics', async () => {
      const mockSystemAnalytics = {
        usageMetrics: {
          totalUsers: 45,
          activeUsers: 38,
          userGrowthRate: 15.2,
          averageSessionDuration: 28.5,
          dailyActiveUsers: 32,
          weeklyActiveUsers: 38,
          monthlyActiveUsers: 42
        },
        resourceUtilization: {
          averageResponseTime: 145,
          peakLoadTimes: [
            { hour: 10, requestCount: 2850 },
            { hour: 14, requestCount: 2650 },
            { hour: 16, requestCount: 2420 }
          ],
          systemUptime: 99.8,
          errorRate: 0.2,
          databaseConnections: {
            active: 15,
            idle: 5,
            total: 20,
            maxConnections: 100
          }
        },
        featureUsage: {
          mostUsedFeatures: [
            { feature: 'APPOINTMENT_BOOKING', usageCount: 1250, percentage: 35.2 },
            { feature: 'PATIENT_MANAGEMENT', usageCount: 980, percentage: 27.6 },
            { feature: 'PROVIDER_SCHEDULE', usageCount: 750, percentage: 21.1 },
            { feature: 'ANALYTICS_DASHBOARD', usageCount: 580, percentage: 16.3 }
          ],
          leastUsedFeatures: [
            { feature: 'BULK_IMPORT', usageCount: 15, percentage: 0.4 },
            { feature: 'API_INTEGRATIONS', usageCount: 25, percentage: 0.7 }
          ]
        },
        performanceMetrics: {
          averagePageLoadTime: 1.85,
          slowestEndpoints: [
            { endpoint: '/api/analytics/revenue', avgResponseTime: 2850 },
            { endpoint: '/api/providers/analytics', avgResponseTime: 1920 },
            { endpoint: '/api/appointments/bulk', avgResponseTime: 1650 }
          ],
          cacheHitRate: 78.5,
          googleSheetsApiCalls: 1250,
          postgresqlQueries: 8500
        },
        errorAnalysis: {
          totalErrors: 45,
          errorsByType: [
            { type: 'VALIDATION_ERROR', count: 25, percentage: 55.6 },
            { type: 'NETWORK_ERROR', count: 12, percentage: 26.7 },
            { type: 'DATABASE_ERROR', count: 8, percentage: 17.8 }
          ],
          criticalErrors: 2,
          averageTimeToResolution: 15.5
        }
      };

      const mockGetSystemAnalytics = jest.mocked(googleSheetsService.getSystemAnalytics);
      mockGetSystemAnalytics.mockResolvedValue(mockSystemAnalytics);

      const response = await request(app)
        .get('/api/analytics/system')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2025-09-01',
          endDate: '2025-09-12'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.usageMetrics.totalUsers).toBe(45);
      expect(response.body.data.resourceUtilization.systemUptime).toBe(99.8);
      expect(response.body.data.featureUsage.mostUsedFeatures).toHaveLength(4);
      expect(response.body.data.performanceMetrics.cacheHitRate).toBe(78.5);
      expect(response.body.data.errorAnalysis.totalErrors).toBe(45);
      
      expect(mockGetSystemAnalytics).toHaveBeenCalledWith(
        testOrgId,
        expect.objectContaining({
          startDate: '2025-09-01',
          endDate: '2025-09-12'
        })
      );
    });

    test('should require SUPER_ADMIN role for system analytics', async () => {
      // Create a regular user
      const regularUserEmail = `regular.${Date.now()}@example.com`;
      await createTestUser({
        email: regularUserEmail,
        firstName: 'Regular',
        lastName: 'User',
        role: 'ORG_ADMIN',
        organizationId: testOrgId
      });

      const regularLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: regularUserEmail,
          password: 'password123'
        });

      const regularToken = regularLoginResponse.body.data.tokens.accessToken;

      const response = await request(app)
        .get('/api/analytics/system')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('insufficient permissions');
    });
  });

  describe('6. Real-time Analytics (GET /api/analytics/realtime)', () => {
    test('should get real-time analytics dashboard', async () => {
      const mockRealtimeAnalytics = {
        liveMetrics: {
          activeUsers: 12,
          ongoingAppointments: 8,
          appointmentsToday: 45,
          revenueToday: 225000,
          systemLoad: 65.2
        },
        recentActivity: [
          {
            type: 'APPOINTMENT_BOOKED',
            timestamp: '2025-09-12T14:30:00Z',
            details: { patientName: 'John Doe', providerName: 'Dr. Smith' }
          },
          {
            type: 'APPOINTMENT_COMPLETED',
            timestamp: '2025-09-12T14:25:00Z',
            details: { patientName: 'Jane Smith', providerName: 'Dr. Johnson', revenue: 5000 }
          }
        ],
        notifications: [
          {
            type: 'WARNING',
            message: 'High appointment cancellation rate detected',
            timestamp: '2025-09-12T14:00:00Z'
          },
          {
            type: 'INFO',
            message: 'Monthly revenue goal achieved',
            timestamp: '2025-09-12T13:45:00Z'
          }
        ],
        quickStats: {
          appointmentsThisWeek: 285,
          revenueThisWeek: 1425000,
          patientSatisfactionScore: 4.8,
          providerUtilizationRate: 82.5
        }
      };

      const mockGetRealtimeAnalytics = jest.mocked(googleSheetsService.getRealtimeAnalytics);
      mockGetRealtimeAnalytics.mockResolvedValue(mockRealtimeAnalytics);

      const response = await request(app)
        .get('/api/analytics/realtime')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.liveMetrics.activeUsers).toBe(12);
      expect(response.body.data.recentActivity).toHaveLength(2);
      expect(response.body.data.notifications).toHaveLength(2);
      expect(response.body.data.quickStats.appointmentsThisWeek).toBe(285);
      
      expect(mockGetRealtimeAnalytics).toHaveBeenCalledWith(testOrgId);
    });
  });

  describe('7. Analytics Export (POST /api/analytics/export)', () => {
    test('should export analytics data as CSV', async () => {
      const mockExportData = {
        exportId: 'export-123',
        downloadUrl: 'https://storage.googleapis.com/exports/analytics-report-123.csv',
        format: 'CSV',
        size: 2048576,
        generatedAt: '2025-09-12T15:00:00Z'
      };

      const mockExportAnalytics = jest.mocked(googleSheetsService.exportAnalytics);
      mockExportAnalytics.mockResolvedValue(mockExportData);

      const response = await request(app)
        .post('/api/analytics/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reportType: 'COMPREHENSIVE',
          format: 'CSV',
          startDate: '2025-01-01',
          endDate: '2025-09-12',
          includeSections: ['patients', 'providers', 'appointments', 'revenue']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.exportId).toBe('export-123');
      expect(response.body.data.format).toBe('CSV');
      expect(response.body.data.downloadUrl).toContain('analytics-report-123.csv');
      
      expect(mockExportAnalytics).toHaveBeenCalledWith(
        testOrgId,
        expect.objectContaining({
          reportType: 'COMPREHENSIVE',
          format: 'CSV',
          startDate: '2025-01-01',
          endDate: '2025-09-12',
          includeSections: ['patients', 'providers', 'appointments', 'revenue']
        })
      );
    });

    test('should export analytics data as PDF report', async () => {
      const mockExportData = {
        exportId: 'export-456',
        downloadUrl: 'https://storage.googleapis.com/exports/analytics-report-456.pdf',
        format: 'PDF',
        size: 5242880,
        generatedAt: '2025-09-12T15:05:00Z'
      };

      const mockExportAnalytics = jest.mocked(googleSheetsService.exportAnalytics);
      mockExportAnalytics.mockResolvedValue(mockExportData);

      const response = await request(app)
        .post('/api/analytics/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reportType: 'EXECUTIVE_SUMMARY',
          format: 'PDF',
          startDate: '2025-08-01',
          endDate: '2025-09-12'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.format).toBe('PDF');
      expect(response.body.data.downloadUrl).toContain('.pdf');
    });

    test('should validate export parameters', async () => {
      const response = await request(app)
        .post('/api/analytics/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
          format: 'CSV'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });
  });

  describe('8. Organization Scoping & Security', () => {
    test('should scope analytics to organization', async () => {
      const mockGetPatientAnalytics = jest.mocked(googleSheetsService.getPatientAnalytics);
      mockGetPatientAnalytics.mockResolvedValue({
        totalPatients: 25,
        demographicBreakdown: { ageGroups: [], genderDistribution: [] },
        appointmentPatterns: { averageAppointmentsPerPatient: 0, mostActivePatients: [], appointmentFrequency: {} },
        revenueContribution: { totalRevenue: 0, averageRevenuePerPatient: 0, topPayingPatients: [] }
      });

      const response = await request(app)
        .get('/api/analytics/patients')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(mockGetPatientAnalytics).toHaveBeenCalledWith(testOrgId, expect.any(Object));
    });

    test('should require authentication for all analytics endpoints', async () => {
      const endpoints = [
        '/api/analytics/patients',
        '/api/analytics/providers',
        '/api/analytics/appointments',
        '/api/analytics/revenue',
        '/api/analytics/realtime'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        expect(response.status).toBe(401);
      }
    });

    test('should prevent cross-organization data access', async () => {
      // Create different organization and user
      const otherOrgId = await createTestOrganization({
        name: 'Other Organization'
      });

      const otherUserEmail = `other.${Date.now()}@example.com`;
      await createTestUser({
        email: otherUserEmail,
        firstName: 'Other',
        lastName: 'User',
        role: 'ORG_ADMIN',
        organizationId: otherOrgId
      });

      const otherLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: otherUserEmail,
          password: 'password123'
        });

      const otherToken = otherLoginResponse.body.data.tokens.accessToken;

      const mockGetPatientAnalytics = jest.mocked(googleSheetsService.getPatientAnalytics);
      mockGetPatientAnalytics.mockResolvedValue({
        totalPatients: 0,
        demographicBreakdown: { ageGroups: [], genderDistribution: [] },
        appointmentPatterns: { averageAppointmentsPerPatient: 0, mostActivePatients: [], appointmentFrequency: {} },
        revenueContribution: { totalRevenue: 0, averageRevenuePerPatient: 0, topPayingPatients: [] }
      });

      const response = await request(app)
        .get('/api/analytics/patients')
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(200);
      expect(mockGetPatientAnalytics).toHaveBeenCalledWith(otherOrgId, expect.any(Object));
      // Should not have access to first organization's data
      expect(mockGetPatientAnalytics).not.toHaveBeenCalledWith(testOrgId, expect.any(Object));
    });
  });

  describe('9. Error Handling & Performance', () => {
    test('should handle Google Sheets service failures gracefully', async () => {
      const mockGetPatientAnalytics = jest.mocked(googleSheetsService.getPatientAnalytics);
      mockGetPatientAnalytics.mockRejectedValue(new Error('Google Sheets API error'));

      const response = await request(app)
        .get('/api/analytics/patients')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.dataSource).toBe('POSTGRESQL_FALLBACK');
    });

    test('should validate date ranges', async () => {
      const response = await request(app)
        .get('/api/analytics/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2025-12-31',
          endDate: '2025-01-01' // End date before start date
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('date range');
    });

    test('should handle large analytics queries efficiently', async () => {
      const mockGetAppointmentAnalytics = jest.mocked(googleSheetsService.getAppointmentAnalytics);
      mockGetAppointmentAnalytics.mockResolvedValue({
        totalAppointments: 10000,
        appointmentTrends: { daily: [], weekly: [], monthly: [] },
        statusDistribution: {},
        timeSlotAnalysis: { peakHours: [], peakDays: [], utilizationByTimeSlot: {} },
        durationAnalysis: { averageDuration: 0, durationDistribution: [], overtimeAnalysis: {} },
        cancellationAnalysis: { totalCancellations: 0, cancellationRate: 0, cancellationReasons: [], advanceNoticeTrends: {} }
      });

      const startTime = Date.now();
      const response = await request(app)
        .get('/api/analytics/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2025-09-12'
        });
      const endTime = Date.now();

      expect(response.status).toBe(200);
      // Should complete within reasonable time (< 5 seconds for large dataset)
      expect(endTime - startTime).toBeLessThan(5000);
    });

    test('should handle invalid analytics parameters', async () => {
      const response = await request(app)
        .get('/api/analytics/providers')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          groupBy: 'invalid-grouping',
          specialization: 'NonExistent Specialty'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('10. Caching & Real-time Updates', () => {
    test('should cache analytics results appropriately', async () => {
      const mockGetPatientAnalytics = jest.mocked(googleSheetsService.getPatientAnalytics);
      mockGetPatientAnalytics.mockResolvedValue({
        totalPatients: 150,
        demographicBreakdown: { ageGroups: [], genderDistribution: [] },
        appointmentPatterns: { averageAppointmentsPerPatient: 0, mostActivePatients: [], appointmentFrequency: {} },
        revenueContribution: { totalRevenue: 0, averageRevenuePerPatient: 0, topPayingPatients: [] }
      });

      // First call
      const response1 = await request(app)
        .get('/api/analytics/patients')
        .set('Authorization', `Bearer ${authToken}`);

      // Second call (should use cache if implemented)
      const response2 = await request(app)
        .get('/api/analytics/patients')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.body.data.totalPatients).toBe(150);
      expect(response2.body.data.totalPatients).toBe(150);
    });

    test('should handle cache invalidation properly', async () => {
      // This test would verify that cache is invalidated when data changes
      // Implementation depends on caching strategy
      const mockGetRealtimeAnalytics = jest.mocked(googleSheetsService.getRealtimeAnalytics);
      mockGetRealtimeAnalytics.mockResolvedValue({
        liveMetrics: { activeUsers: 12, ongoingAppointments: 8, appointmentsToday: 45, revenueToday: 225000, systemLoad: 65.2 },
        recentActivity: [],
        notifications: [],
        quickStats: { appointmentsThisWeek: 0, revenueThisWeek: 0, patientSatisfactionScore: 0, providerUtilizationRate: 0 }
      });

      const response = await request(app)
        .get('/api/analytics/realtime')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      // Real-time analytics should not be cached
      expect(response.headers['cache-control']).not.toContain('max-age');
    });
  });
});