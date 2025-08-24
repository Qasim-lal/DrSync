import { Router, Request, Response } from 'express';
import { getDbPool } from '../config/database';
import { getRedisClient } from '../config/redis';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    database: 'connected' | 'disconnected' | 'error';
    redis: 'connected' | 'disconnected' | 'error';
    server: 'running';
  };
  uptime: number;
  environment: string;
  version: string;
}

// Health check endpoint
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const healthCheck: HealthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      redis: 'connected',
      server: 'running',
    },
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
  };

  // Check database connection
  try {
    const pool = getDbPool();
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    healthCheck.services.database = 'connected';
  } catch (error) {
    healthCheck.services.database = 'error';
    healthCheck.status = 'unhealthy';
  }

  // Check Redis connection
  try {
    const redisClient = getRedisClient();
    await redisClient.ping();
    healthCheck.services.redis = 'connected';
  } catch (error) {
    healthCheck.services.redis = 'error';
    healthCheck.status = 'unhealthy';
  }

  const statusCode = healthCheck.status === 'healthy' ? 200 : 503;
  
  res.status(statusCode).json({
    success: healthCheck.status === 'healthy',
    data: healthCheck,
  });
}));

// Detailed health check with database info
router.get('/detailed', asyncHandler(async (_req: Request, res: Response) => {
  const detailedHealth = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: {
        status: 'connected',
        details: {} as any,
      },
      redis: {
        status: 'connected',
        details: {} as any,
      },
    },
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      platform: process.platform,
      nodeVersion: process.version,
    },
    environment: process.env.NODE_ENV || 'development',
  };

  // Database details
  try {
    const pool = getDbPool();
    const client = await pool.connect();
    
    const dbResult = await client.query('SELECT version(), now() as current_time');
    const statsResult = await client.query(`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes
      FROM pg_stat_user_tables 
      LIMIT 5
    `);
    
    detailedHealth.services.database.details = {
      version: dbResult.rows[0].version,
      currentTime: dbResult.rows[0].current_time,
      tableStats: statsResult.rows,
      totalConnections: pool.totalCount,
      idleConnections: pool.idleCount,
      waitingClients: pool.waitingCount,
    };
    
    client.release();
  } catch (error) {
    detailedHealth.services.database.status = 'error';
    detailedHealth.services.database.details = { error: (error as Error).message };
    detailedHealth.status = 'unhealthy';
  }

  // Redis details
  try {
    const redisClient = getRedisClient();
    const info = await redisClient.info();
    const dbsize = await redisClient.dbSize();
    
    detailedHealth.services.redis.details = {
      connected: redisClient.isReady,
      dbSize: dbsize,
      info: info.split('\r\n').slice(0, 10).join('\n'), // First 10 lines of info
    };
  } catch (error) {
    detailedHealth.services.redis.status = 'error';
    detailedHealth.services.redis.details = { error: (error as Error).message };
    detailedHealth.status = 'unhealthy';
  }

  const statusCode = detailedHealth.status === 'healthy' ? 200 : 503;
  
  res.status(statusCode).json({
    success: detailedHealth.status === 'healthy',
    data: detailedHealth,
  });
}));

// Readiness probe (for Kubernetes)
router.get('/ready', asyncHandler(async (_req: Request, res: Response) => {
  try {
    // Check if all critical services are ready
    const pool = getDbPool();
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();

    const redisClient = getRedisClient();
    await redisClient.ping();

    res.status(200).json({
      success: true,
      message: 'Service is ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Service is not ready',
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
    });
  }
}));

// Liveness probe (for Kubernetes)
router.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Service is alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;
