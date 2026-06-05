import { Redis } from 'ioredis'
import { env } from '../env.js'

// maxRetriesPerRequest: null is required by BullMQ (disables the per-request
// retry cap so blocking queue commands can wait indefinitely for new jobs).
export const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null })
redis.on('error', (err) => console.error('[redis] connection error:', err.message))
