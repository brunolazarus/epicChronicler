import { Queue } from 'bullmq'
import { redis } from '../lib/redis.js'
import { QueueName, type JobName } from './names.js'

export interface TranscriptionJobData {
  audioKey: string
  filename: string
  uploadedAt: string
}

export interface TranscriptionJobResult {
  transcript: string
  transcriptionMs: number
}

export interface ChronicleJobData {
  transcripts: Array<{ speaker: string; text: string }>
  flavour: string
  requestedAt: string
}

export interface ChronicleJobResult {
  text: string
  audioKey: string
  llmMs: number
  ttsMs: number
  totalMs: number
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
}

export const transcriptionQueue = new Queue<TranscriptionJobData, TranscriptionJobResult, JobName>(
  QueueName.TRANSCRIPTION,
  {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    },
  },
)

export const chronicleQueue = new Queue<ChronicleJobData, ChronicleJobResult, JobName>(
  QueueName.CHRONICLE,
  {
    connection: redis,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'exponential', delay: 3000 },
    },
  },
)
