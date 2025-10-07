import dotenv from 'dotenv';
import { app } from './app';
import { logger } from './utils/logger';
import { connectDatabase } from './services/prisma';
import { connectRedis } from './config/redis';
import ScheduledBillingService from './services/scheduledBillingService';
import { checkEmailConfigOnStartup } from './utils/emailConfigValidator';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3001;

// Graceful shutdown handler
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

// Start server
const startServer = async () => {
  try {
    // Validate email configuration (will throw in production if not configured)
    logger.info('Validating email configuration...');
    checkEmailConfigOnStartup();

    // Connect to database
    logger.info('Connecting to database...');
    await connectDatabase();
    logger.info('Database connected successfully');

    // Connect to Redis
    logger.info('Connecting to Redis...');
    await connectRedis();
    logger.info('Redis connected successfully');

    // Start scheduled billing tasks
    if (process.env.NODE_ENV !== 'test') {
      logger.info('Starting scheduled billing tasks...');
      ScheduledBillingService.startScheduledTasks();
      logger.info('Scheduled billing tasks started successfully');
    }

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`🚀 DrSync Backend Server running on port ${PORT}`);
      logger.info(`📊 Health check: http://localhost:${PORT}/health`);
      logger.info(`📚 API docs: http://localhost:${PORT}/api/docs`);
      logger.info(`💳 Billing API: http://localhost:${PORT}/api/billing`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
