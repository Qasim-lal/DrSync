import { config } from 'dotenv';

// Load environment variables for testing
config({ path: '.env.test' });

// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing-only';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/drsync_test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://:drsync_redis_password@redis:6379/1';
process.env.REDIS_HOST = process.env.REDIS_HOST || 'redis';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';
process.env.REDIS_PASSWORD = process.env.REDIS_PASSWORD || 'drsync_redis_password';

// Global test timeout - increased for Docker environment
jest.setTimeout(30000);

// Redis is now optional - no mocking needed
// Tests will run without Redis configured

// Global test setup and teardown
beforeAll(async () => {
  // Initialize Redis for test environment
  try {
    const { connectRedis } = await import('../src/config/redis');
    await connectRedis();
  } catch (error) {
    console.error('Failed to connect to Redis for tests:', error);
    console.log('Make sure Redis is running for tests');
    process.exit(1);
  }
});

afterAll(async () => {
  // Clean up Redis connection
  try {
    const { closeRedis } = await import('../src/config/redis');
    await closeRedis();
  } catch (error) {
    // Redis cleanup failed - not critical for tests
  }
});
