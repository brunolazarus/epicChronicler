import { Redis } from 'ioredis'
import { env } from './environment.js'

// maxRetriesPerRequest: null is required by BullMQ (disables the per-request
// retry cap so blocking queue commands can wait indefinitely for new jobs).
let _redis: Redis | null = null

export function getRedis(): Redis {
  if (!_redis) {
    if (!env.REDIS_URL) throw new Error('REDIS_URL is not configured')
    _redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null })
    _redis.on('error', (err) => console.error('[redis] connection error:', err.message))
  }
  return _redis
}
