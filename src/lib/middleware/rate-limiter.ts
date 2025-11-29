/**
 * Rate Limiting Middleware
 * 
 * Redis-ready rate limiter with in-memory fallback
 * Prevents API abuse and DDoS attacks
 */

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: any) => string; // Custom key generator
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitStore {
  get(key: string): Promise<{ count: number; resetAt: number } | null>;
  set(key: string, value: { count: number; resetAt: number }, ttl: number): Promise<void>;
  increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
}

/**
 * In-memory rate limit store (fallback when Redis unavailable)
 */
class MemoryRateLimitStore implements RateLimitStore {
  private store: Map<string, { count: number; resetAt: number }> = new Map();

  async get(key: string): Promise<{ count: number; resetAt: number } | null> {
    const value = this.store.get(key);
    if (!value) return null;
    
    // Clean up expired entries
    if (Date.now() > value.resetAt) {
      this.store.delete(key);
      return null;
    }
    
    return value;
  }

  async set(key: string, value: { count: number; resetAt: number }, ttl: number): Promise<void> {
    this.store.set(key, value);
    // Auto-cleanup after TTL
    setTimeout(() => this.store.delete(key), ttl);
  }

  async increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }> {
    const now = Date.now();
    const existing = await this.get(key);
    
    if (!existing) {
      const newValue = { count: 1, resetAt: now + windowMs };
      await this.set(key, newValue, windowMs);
      return newValue;
    }
    
    existing.count++;
    await this.set(key, existing, existing.resetAt - now);
    return existing;
  }
}

/**
 * Redis rate limit store (production)
 */
class RedisRateLimitStore implements RateLimitStore {
  private redis: any; // Redis client

  constructor(redisUrl?: string) {
    // Lazy load redis client
    if (redisUrl) {
      try {
        // In production, use actual Redis client
        // const Redis = require('ioredis');
        // this.redis = new Redis(redisUrl);
        this.redis = null; // Placeholder
      } catch (error) {
        console.warn('Redis not available, falling back to memory store');
        this.redis = null;
      }
    }
  }

  async get(key: string): Promise<{ count: number; resetAt: number } | null> {
    if (!this.redis) return null;
    
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      return null;
    }
  }

  async set(key: string, value: { count: number; resetAt: number }, ttl: number): Promise<void> {
    if (!this.redis) return;
    
    try {
      await this.redis.setex(key, Math.ceil(ttl / 1000), JSON.stringify(value));
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  async increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }> {
    if (!this.redis) {
      // Fallback to memory if Redis unavailable
      const memoryStore = new MemoryRateLimitStore();
      return memoryStore.increment(key, windowMs);
    }
    
    try {
      const now = Date.now();
      const resetAt = now + windowMs;
      
      // Use Redis INCR with expiration
      const count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.pexpire(key, windowMs);
      }
      
      return { count, resetAt };
    } catch (error) {
      console.error('Redis increment error:', error);
      throw error;
    }
  }
}

/**
 * Rate Limiter
 */
export class RateLimiter {
  private store: RateLimitStore;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig, redisUrl?: string) {
    this.config = config;
    
    // Use Redis if available, otherwise fallback to memory
    if (redisUrl) {
      this.store = new RedisRateLimitStore(redisUrl);
    } else {
      this.store = new MemoryRateLimitStore();
    }
  }

  /**
   * Check if request should be rate limited
   */
  async check(key: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: number;
  }> {
    const result = await this.store.increment(key, this.config.windowMs);
    
    const allowed = result.count <= this.config.maxRequests;
    const remaining = Math.max(0, this.config.maxRequests - result.count);
    
    return {
      allowed,
      remaining,
      resetAt: result.resetAt,
    };
  }

  /**
   * Generate rate limit key from request
   */
  generateKey(req: any, customKey?: string): string {
    if (customKey) return customKey;
    
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(req);
    }
    
    // Default: use IP address or API key
    const ip = req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'] || 'unknown';
    const apiKey = req.body?.apiKey || req.query?.apiKey || 'anonymous';
    
    return `ratelimit:${apiKey}:${ip}`;
  }
}

/**
 * Create rate limiter middleware for Next.js API routes
 */
export function createRateLimiter(config: RateLimitConfig) {
  const redisUrl = process.env.REDIS_URL;
  const limiter = new RateLimiter(config, redisUrl);

  return async (req: any, res?: any) => {
    const key = limiter.generateKey(req);
    const result = await limiter.check(key);

    if (!result.allowed) {
      if (res) {
        res.setHeader('X-RateLimit-Limit', config.maxRequests);
        res.setHeader('X-RateLimit-Remaining', result.remaining);
        res.setHeader('X-RateLimit-Reset', new Date(result.resetAt).toISOString());
        res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
        });
      }
      return { allowed: false, result };
    }

    if (res) {
      res.setHeader('X-RateLimit-Limit', config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', new Date(result.resetAt).toISOString());
    }

    return { allowed: true, result };
  };
}

/**
 * Pre-configured rate limiters for different endpoints
 */
export const rateLimiters = {
  // Public API endpoints - stricter limits
  publicAPI: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
  }),

  // Asset analysis - moderate limits
  assetAnalysis: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
  }),

  // Community reports - strict limits to prevent spam
  communityReports: createRateLimiter({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    maxRequests: 5,
  }),

  // Contract verification - moderate limits
  contractVerification: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5,
  }),
};

