import { Queue } from 'bullmq'
import { getRedis, QueueName, QueuePrefix } from '@chronicler/core'
import type { PipelineJobData, PipelineJobResult, JobNameType } from '@chronicler/core'

export const pipelineQueue = new Queue<PipelineJobData, PipelineJobResult, JobNameType>(
  QueueName.PIPELINE,
  {
    connection: getRedis(),
    prefix: QueuePrefix.MCP,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  },
)
