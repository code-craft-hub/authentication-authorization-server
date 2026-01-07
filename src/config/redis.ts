import Redis from 'ioredis';
import { env } from './env';
import { logger } from '@/utils/logger';

class RedisConnection {
  private static instance: RedisConnection;
  public client: Redis;

  private constructor() {
    this.client = new Redis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.client.on('connect', () => {
      logger.info('Redis connection established');
    });

    this.client.on('error', (error) => {
      logger.error('Redis connection error:', error);
    });
  }

  public static getInstance(): RedisConnection {
    if (!RedisConnection.instance) {
      RedisConnection.instance = new RedisConnection();
    }
    return RedisConnection.instance;
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return false;
    }
  }

  public async close(): Promise<void> {
    await this.client.quit();
    logger.info('Redis connection closed');
  }
}

export const redisConnection = RedisConnection.getInstance();
export const redis = redisConnection.client;

// Cache utility functions
export const cacheService = {
  async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  },

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const stringValue = JSON.stringify(value);
    if (ttlSeconds) {
      await redis.setex(key, ttlSeconds, stringValue);
    } else {
      await redis.set(key, stringValue);
    }
  },

  async delete(key: string): Promise<void> {
    await redis.del(key);
  },

  async deletePattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },

  async exists(key: string): Promise<boolean> {
    const result = await redis.exists(key);
    return result === 1;
  },
};