import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

let redisClient: RedisClientType | null = null;

export const getRedisPassword = (): string | undefined => {
  return process.env.REDIS_PASSWORD_RAW || process.env.REDIS_PASSWORD || undefined;
};

export const getRedisUrl = (): string => {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }

  const host = process.env.REDIS_HOST || 'localhost';
  const port = process.env.REDIS_PORT || '6379';
  const password = getRedisPassword();

  return password
    ? `redis://:${encodeURIComponent(password)}@${host}:${port}`
    : `redis://${host}:${port}`;
};

export const getRedisConnectionConfig = (): any => {
  const password = getRedisPassword();

  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    ...(password ? { password } : {}),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
};

export const connectRedis = async (): Promise<RedisClientType> => {
  if (redisClient) {
    return redisClient;
  }

  try {
    const clientConfig: any = {
      url: getRedisUrl(),
    };
    
    const redisPassword = getRedisPassword();
    if (redisPassword) {
      clientConfig.password = redisPassword;
    }
    
    redisClient = createClient(clientConfig);

    redisClient.on('error', (error) => {
      logger.error('Redis Client Error:', error);
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected successfully');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready to use');
    });

    await redisClient.connect();
    
    // Test the connection
    await redisClient.ping();
    
    logger.info('Redis connection established successfully');
    return redisClient;
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
};

export const getRedisClient = (): RedisClientType => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return redisClient;
};

export const isRedisAvailable = (): boolean => {
  return redisClient !== null && redisClient?.isReady;
};

export const closeRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis connection closed');
  }
};

// Handle process termination
process.on('SIGINT', async () => {
  await closeRedis();
});

process.on('SIGTERM', async () => {
  await closeRedis();
});
