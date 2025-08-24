import { PrismaClient } from '../generated/prisma';
import { logger } from '../utils/logger';

// Global Prisma client instance
let prisma: PrismaClient | undefined;

/**
 * Get or create Prisma client instance
 * Implements singleton pattern for efficient connection pooling
 */
export const getPrismaClient = (): PrismaClient => {
  if (!prisma) {
    prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });

    logger.info('Prisma client initialized');
  }

  return prisma;
};

/**
 * Connect to the database
 * Should be called during application startup
 */
export const connectDatabase = async (): Promise<void> => {
  try {
    const client = getPrismaClient();
    await client.$connect();
    
    // Test the connection
    await client.$queryRaw`SELECT 1`;
    
    logger.info('Database connection established successfully');
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
};

/**
 * Disconnect from the database
 * Should be called during application shutdown
 */
export const disconnectDatabase = async (): Promise<void> => {
  if (prisma) {
    await prisma.$disconnect();
    prisma = undefined;
    logger.info('Database connection closed');
  }
};

/**
 * Health check for database connection
 */
export const isDatabaseConnected = async (): Promise<boolean> => {
  try {
    const client = getPrismaClient();
    await client.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
};

/**
 * Get database statistics
 */
export const getDatabaseStats = async () => {
  try {
    const client = getPrismaClient();
    
    const [
      organizationCount,
      userCount,
      patientCount,
      providerCount,
      appointmentCount,
      messageCount,
    ] = await Promise.all([
      client.organization.count(),
      client.user.count(),
      client.patient.count(),
      client.provider.count(),
      client.appointment.count(),
      client.whatsAppMessage.count(),
    ]);

    return {
      organizations: organizationCount,
      users: userCount,
      patients: patientCount,
      providers: providerCount,
      appointments: appointmentCount,
      messages: messageCount,
    };
  } catch (error) {
    logger.error('Failed to get database stats:', error);
    throw error;
  }
};

// Handle process termination gracefully
process.on('beforeExit', async () => {
  await disconnectDatabase();
});

process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDatabase();
  process.exit(0);
});

// Export the client for direct use when needed
export { prisma as directPrismaClient };
export default getPrismaClient;
