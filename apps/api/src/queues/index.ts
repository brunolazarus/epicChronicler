import { Queue } from 'bullmq'
import { redis, QueueName } from '@chronicler/core'
import type { JobName, TranscriptionJobData, TranscriptionJobResult, ChronicleJobData, ChronicleJobResult } from '@chronicler/core'

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
