import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { randomUUID } from 'crypto'
import type { Job } from 'bullmq'
import { uploadToR2, downloadFromR2, FLAVOURS, FLAVOUR_KEYS, QueueName, JobName } from '@chronicler/core'
import type { TranscriptionJobData, TranscriptionJobResult, ChronicleJobData, ChronicleJobResult } from '@chronicler/core'
import { transcriptionQueue, chronicleQueue } from '../queues/index.js'

type AnyJob =
  | Job<TranscriptionJobData, TranscriptionJobResult, JobName>
  | Job<ChronicleJobData, ChronicleJobResult, JobName>

const pipeline = new OpenAPIHono()

// --- Schemas ---

const JobQueuedSchema = z.object({
  jobId: z.string(),
  status: z.literal('queued'),
})

const JobStatusSchema = z.object({
  id: z.string().nullable(),
  queue: z.enum(['transcription', 'chronicle']),
  status: z.string(),
  progress: z.number(),
  result: z.any(),
  error: z.string().nullable(),
})

const GenerateBodySchema = z.object({
  transcripts: z.array(z.object({ speaker: z.string(), text: z.string() })).min(1),
  flavour: z.enum(FLAVOUR_KEYS as [string, ...string[]]),
})

const FlavourSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string(),
})

const ErrorSchema = z.object({ error: z.string() })

// --- Routes ---

pipeline.openapi(
  createRoute({
    method: 'post',
    path: '/upload',
    summary: 'Upload audio for transcription',
    description: 'Accepts a multipart audio file (max 25 MB), stores it in R2, and enqueues a Whisper transcription job.',
    request: {
      body: { content: { 'multipart/form-data': { schema: z.object({ audio: z.any() }) } } },
    },
    responses: {
      200: { content: { 'application/json': { schema: JobQueuedSchema } }, description: 'Job enqueued' },
      400: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Missing or invalid audio field' },
      413: { content: { 'application/json': { schema: ErrorSchema } }, description: 'File exceeds 25 MB limit' },
    },
  }),
  async (c) => {
    const body = await c.req.parseBody()
    const file = body['audio']

    if (!file || typeof file === 'string') {
      return c.json({ error: 'Field "audio" must be an audio file' }, 400)
    }

    const MAX_BYTES = 25 * 1024 * 1024
    if (file.size > MAX_BYTES) {
      return c.json({ error: 'Audio file must be under 25 MB' }, 413)
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

    return c.json({ jobId: job.id!, status: 'queued' as const }, 200)
  },
)

pipeline.openapi(
  createRoute({
    method: 'get',
    path: '/jobs/{id}',
    summary: 'Poll job status',
    description: 'Returns the current state of a transcription or chronicle job. Poll until status is `completed` or `failed`.',
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      200: { content: { 'application/json': { schema: JobStatusSchema } }, description: 'Job state' },
      404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Job not found' },
    },
  }),
  async (c) => {
    const { id } = c.req.valid('param')

    let job: AnyJob | undefined = await transcriptionQueue.getJob(id)
    let queue: QueueName = QueueName.TRANSCRIPTION

    if (!job) {
      job = await chronicleQueue.getJob(id)
      queue = QueueName.CHRONICLE
    }

    if (!job) return c.json({ error: 'Job not found' }, 404)

    const state = await job.getState()

    return c.json({
      id: job.id ?? null,
      queue,
      status: state,
      progress: job.progress as number,
      result: state === 'completed' ? job.returnvalue : null,
      error: state === 'failed' ? (job.failedReason ?? null) : null,
    }, 200)
  },
)

pipeline.openapi(
  createRoute({
    method: 'post',
    path: '/generate',
    summary: 'Generate a chronicle',
    description: 'Sends transcripts through Claude (LLM) and OpenAI TTS in the chosen flavour. Enqueues an async job — poll `/jobs/:id` for the result.',
    request: {
      body: { content: { 'application/json': { schema: GenerateBodySchema } } },
    },
    responses: {
      200: { content: { 'application/json': { schema: JobQueuedSchema } }, description: 'Job enqueued' },
      400: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Invalid request body' },
    },
  }),
  async (c) => {
    const { transcripts, flavour } = c.req.valid('json')

    const job = await chronicleQueue.add(JobName.GENERATE, {
      transcripts,
      flavour,
      requestedAt: new Date().toISOString(),
    })

    return c.json({ jobId: job.id!, status: 'queued' as const }, 200)
  },
)

pipeline.openapi(
  createRoute({
    method: 'get',
    path: '/audio/{key}',
    summary: 'Stream TTS audio',
    description: 'Streams the generated MP3 from R2. Only serves keys prefixed with `tts-`.',
    request: {
      params: z.object({ key: z.string() }),
    },
    responses: {
      200: { content: { 'audio/mpeg': { schema: z.any() } }, description: 'MP3 audio stream' },
      404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Audio not found' },
    },
  }),
  async (c) => {
    const { key } = c.req.valid('param')

    if (!key.startsWith('tts-')) return c.json({ error: 'Not found' }, 404)

    try {
      const buffer = await downloadFromR2(key)
      const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
      c.header('Content-Type', 'audio/mpeg')
      c.header('Content-Length', String(buffer.length))
      c.header('Cache-Control', 'public, max-age=3600')
      return c.body(ab as ArrayBuffer)
    } catch {
      return c.json({ error: 'Audio not found' }, 404)
    }
  },
)

pipeline.openapi(
  createRoute({
    method: 'get',
    path: '/flavours',
    summary: 'List available flavours',
    description: 'Returns all narrative styles available for chronicle generation.',
    responses: {
      200: {
        content: { 'application/json': { schema: z.array(FlavourSchema) } },
        description: 'Flavour list',
      },
    },
  }),
  (c) =>
    c.json(
      FLAVOUR_KEYS.map((key) => ({
        key,
        name: FLAVOURS[key].name,
        description: FLAVOURS[key].description,
      })),
    ),
)

export default pipeline
