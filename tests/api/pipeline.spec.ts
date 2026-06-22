import { test, expect } from '@playwright/test'

// ── GET /api/v1/pipeline/flavours ────────────────────────────────────────────

test('GET /flavours returns all four narrative styles', async ({ request }) => {
  const res = await request.get('/api/v1/pipeline/flavours')
  expect(res.status()).toBe(200)

  const flavours = await res.json()
  expect(Array.isArray(flavours)).toBe(true)
  expect(flavours).toHaveLength(4)

  const keys = flavours.map((f: { key: string }) => f.key)
  expect(keys).toContain('medieval')
  expect(keys).toContain('sports')
  expect(keys).toContain('nature')
  expect(keys).toContain('fantasy')

  for (const flavour of flavours) {
    expect(typeof flavour.key).toBe('string')
    expect(typeof flavour.name).toBe('string')
    expect(typeof flavour.description).toBe('string')
  }
})

// ── GET /api/v1/pipeline/jobs/:id ────────────────────────────────────────────

test('GET /jobs/:id returns 404 for unknown job', async ({ request }) => {
  const res = await request.get('/api/v1/pipeline/jobs/nonexistent-job-id')
  expect(res.status()).toBe(404)

  const body = await res.json()
  expect(body).toHaveProperty('error')
})

// ── POST /api/v1/pipeline/generate ───────────────────────────────────────────

test('POST /generate returns 400 when body is missing', async ({ request }) => {
  const res = await request.post('/api/v1/pipeline/generate', {
    data: {},
  })
  expect(res.status()).toBe(400)
})

test('POST /generate returns 400 when transcripts array is empty', async ({ request }) => {
  const res = await request.post('/api/v1/pipeline/generate', {
    data: { transcripts: [], flavour: 'medieval' },
  })
  expect(res.status()).toBe(400)
})

test('POST /generate returns 400 when flavour is invalid', async ({ request }) => {
  const res = await request.post('/api/v1/pipeline/generate', {
    data: {
      transcripts: [{ speaker: 'Narrator', text: 'Test story' }],
      flavour: 'invalid-flavour',
    },
  })
  expect(res.status()).toBe(400)
})

// ── POST /api/v1/pipeline/upload ─────────────────────────────────────────────

test('POST /upload returns 400 when no audio field', async ({ request }) => {
  const res = await request.post('/api/v1/pipeline/upload', {
    multipart: {},
  })
  expect(res.status()).toBe(400)
  const body = await res.json()
  expect(body).toHaveProperty('error')
})

// ── Rate limiting ─────────────────────────────────────────────────────────────

test('rate limiter returns 429 after 10 requests per IP within window', async ({ request }) => {
  const payload = {
    transcripts: [{ speaker: 'Test', text: 'story' }],
    flavour: 'invalid-flavour-so-it-rejects-fast',
  }

  let tooManyCount = 0
  for (let i = 0; i < 12; i++) {
    const res = await request.post('/api/v1/pipeline/generate', { data: payload })
    if (res.status() === 429) tooManyCount++
  }

  expect(tooManyCount).toBeGreaterThan(0)
})

// ── GET /api/v1/pipeline/audio/:key ──────────────────────────────────────────

test('GET /audio/:key returns 404 for non-tts- prefixed key', async ({ request }) => {
  const res = await request.get('/api/v1/pipeline/audio/not-a-tts-key.mp3')
  expect(res.status()).toBe(404)
})
