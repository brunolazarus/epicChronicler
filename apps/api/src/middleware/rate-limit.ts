import type { MiddlewareHandler } from 'hono'

interface Window {
  count: number
  resetAt: number
}

const store = new Map<string, Window>()

// Evict expired entries every 10 minutes to keep the Map bounded.
setInterval(() => {
  const now = Date.now()
  for (const [key, win] of store) {
    if (now > win.resetAt) store.delete(key)
  }
}, 10 * 60 * 1000).unref()

export function rateLimit(limit: number, windowMs: number): MiddlewareHandler {
  return async (c, next) => {
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0].trim() ??
      c.req.header('x-real-ip') ??
      'unknown'

    const now = Date.now()
    const win = store.get(ip)

    if (!win || now > win.resetAt) {
      store.set(ip, { count: 1, resetAt: now + windowMs })
    } else if (win.count >= limit) {
      return c.json({ error: 'Too many requests — slow down' }, 429)
    } else {
      win.count++
    }

    await next()
  }
}
