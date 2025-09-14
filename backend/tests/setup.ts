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
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379/1';

// Global test timeout
jest.setTimeout(10000);

// Mock Redis for tests if needed
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
  })),
}));

// Global test setup and teardown
beforeAll(async () => {
  // Any global setup needed
});

afterAll(async () => {
  // Any global cleanup needed
});
