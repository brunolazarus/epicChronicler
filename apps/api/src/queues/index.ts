import { Queue } from 'bullmq'
import { getRedis, QueueName } from '@chronicler/core'
import type { JobName, TranscriptionJobData, TranscriptionJobResult, ChronicleJobData, ChronicleJobResult } from '@chronicler/core'

export const transcriptionQueue = new Queue<TranscriptionJobData, TranscriptionJobResult, JobName>(
  QueueName.TRANSCRIPTION,
  {
    connection: getRedis(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  },
)

export const chronicleQueue = new Queue<ChronicleJobData, ChronicleJobResult, JobName>(
  QueueName.CHRONICLE,
  {
    connection: getRedis(),
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  },
)
