import dotenv from 'dotenv';
import { app } from './app';
import { logger } from './utils/logger';
import { connectDatabase } from './services/prisma';
import { connectRedis } from './config/redis';

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
    // Connect to database
    logger.info('Connecting to database...');
    await connectDatabase();
    logger.info('Database connected successfully');

    // Connect to Redis
    logger.info('Connecting to Redis...');
    await connectRedis();
    logger.info('Redis connected successfully');

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`🚀 DrSync Backend Server running on port ${PORT}`);
      logger.info(`📊 Health check: http://localhost:${PORT}/health`);
      logger.info(`📚 API docs: http://localhost:${PORT}/api/docs`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
