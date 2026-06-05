import { Hono } from 'hono'
import { randomUUID } from 'crypto'
import type { Job } from 'bullmq'
import { uploadToR2, downloadFromR2 } from '../lib/r2.js'
import { transcriptionQueue, chronicleQueue } from '../queues/index.js'
import type { TranscriptionJobData, TranscriptionJobResult, ChronicleJobData, ChronicleJobResult } from '../queues/index.js'
import { FLAVOURS, FLAVOUR_KEYS } from '../flavours/index.js'
import { QueueName, JobName } from '../queues/names.js'

type AnyJob =
  | Job<TranscriptionJobData, TranscriptionJobResult, JobName>
  | Job<ChronicleJobData, ChronicleJobResult, JobName>

const pipeline = new Hono()

// Upload audio → enqueue transcription
pipeline.post('/upload', async (c) => {
  const body = await c.req.parseBody()
  const file = body['audio']

  if (!file || typeof file === 'string') {
    return c.json({ error: 'Field "audio" must be an audio file' }, 400)
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = file.name.split('.').pop() ?? 'mp3'
  const audioKey = `tmp-${randomUUID()}.${ext}`

  await uploadToR2(audioKey, buffer, file.type || 'audio/mpeg')

  const job = await transcriptionQueue.add(JobName.TRANSCRIBE, {
    audioKey,
    filename: file.name,
    uploadedAt: new Date().toISOString(),
  })

  return c.json({ jobId: job.id, status: 'queued' })
})

// Poll job status (works for both queues)
pipeline.get('/jobs/:id', async (c) => {
  const id = c.req.param('id')

  let job: AnyJob | undefined = await transcriptionQueue.getJob(id)
  let queue: QueueName = QueueName.TRANSCRIPTION

  if (!job) {
    job = await chronicleQueue.getJob(id)
    queue = QueueName.CHRONICLE
  }

  if (!job) return c.json({ error: 'Job not found' }, 404)

  const state = await job.getState()

  return c.json({
    id: job.id,
    queue,
    status: state,
    progress: job.progress,
    result: state === 'completed' ? job.returnvalue : null,
    error: state === 'failed' ? job.failedReason : null,
  })
})

// Enqueue chronicle generation (LLM + TTS)
pipeline.post('/generate', async (c) => {
  const body = await c.req.json<{
    transcripts: Array<{ speaker: string; text: string }>
    flavour: string
  }>()

  if (!Array.isArray(body.transcripts) || body.transcripts.length === 0) {
    return c.json({ error: 'Provide at least one transcript' }, 400)
  }

  if (!FLAVOUR_KEYS.includes(body.flavour as never)) {
    return c.json({ error: `flavour must be one of: ${FLAVOUR_KEYS.join(', ')}` }, 400)
  }

  const job = await chronicleQueue.add(JobName.GENERATE, {
    transcripts: body.transcripts,
    flavour: body.flavour,
    requestedAt: new Date().toISOString(),
  })

  return c.json({ jobId: job.id, status: 'queued' })
})

// Stream TTS audio from R2
pipeline.get('/audio/:key', async (c) => {
  const key = c.req.param('key')

  // Only serve TTS output — never raw uploads
  if (!key.startsWith('tts-')) return c.json({ error: 'Not found' }, 404)

  try {
    const buffer = await downloadFromR2(key)
    // Hono's body() accepts ArrayBuffer/Uint8Array — not Node Buffer directly
    const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    c.header('Content-Type', 'audio/mpeg')
    c.header('Content-Length', String(buffer.length))
    c.header('Cache-Control', 'public, max-age=3600')
    return c.body(ab as ArrayBuffer)
  } catch {
    return c.json({ error: 'Audio not found' }, 404)
  }
})

// List available flavours
pipeline.get('/flavours', (c) =>
  c.json(
    FLAVOUR_KEYS.map((key) => ({
      key,
      name: FLAVOURS[key].name,
      description: FLAVOURS[key].description,
    })),
  ),
)

export default pipeline
