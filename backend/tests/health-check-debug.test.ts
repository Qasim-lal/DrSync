/**
 * Health Check Debug Test
 * 
 * Isolates and debugs the health endpoint issue that's causing 503 errors
 * during test execution while working fine in direct API calls.
 */

import request from 'supertest';
import { app } from '../src/app';

describe('Health Check Debug', () => {
  test('Health endpoint should return 200', async () => {
    const response = await request(app)
      .get('/health');
    
    console.log('Health check response status:', response.status);
    console.log('Health check response body:', JSON.stringify(response.body, null, 2));
    
    if (response.status !== 200) {
      // If it fails, let's check the detailed health endpoint
      const detailedResponse = await request(app)
        .get('/health/detailed');
      
      console.log('Detailed health check status:', detailedResponse.status);
      console.log('Detailed health check body:', JSON.stringify(detailedResponse.body, null, 2));
      
      // Also check the readiness endpoint
      const readyResponse = await request(app)
        .get('/health/ready');
      
      console.log('Ready check status:', readyResponse.status);
      console.log('Ready check body:', JSON.stringify(readyResponse.body, null, 2));
    }
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('healthy');
  });

  test('Health endpoint components should work individually', async () => {
    // Test database connection directly
    const { isDatabaseConnected } = await import('../src/services/prisma');
    const dbStatus = await isDatabaseConnected();
    console.log('Direct database check:', dbStatus);
    expect(dbStatus).toBe(true);

    // Test Redis connection directly
    try {
      const { getRedisClient, isRedisAvailable } = await import('../src/config/redis');
      const redisClient = getRedisClient();
      if (redisClient && isRedisAvailable()) {
        await redisClient.ping();
        console.log('Direct Redis check: success');
      } else {
        console.log('Direct Redis check: Redis not available (expected in test environment)');
      }
    } catch (error) {
      console.log('Direct Redis check failed:', error);
    }
  });
});