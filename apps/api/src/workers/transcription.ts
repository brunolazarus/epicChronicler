import { Worker } from 'bullmq'
import { redis } from '../lib/redis.js'
import { downloadFromR2, deleteFromR2 } from '../lib/r2.js'
import { transcribeAudio } from '../lib/transcription/index.js'
import type { TranscriptionJobData, TranscriptionJobResult } from '../queues/index.js'
import { QueueName, type JobName } from '../queues/names.js'

export function createTranscriptionWorker() {
  return new Worker<TranscriptionJobData, TranscriptionJobResult, JobName>(
    QueueName.TRANSCRIPTION,
    async (job) => {
      const { audioKey, filename } = job.data

      await job.updateProgress(10)
      const audioBuffer = await downloadFromR2(audioKey)

      await job.updateProgress(40)
      const { transcript, transcriptionMs } = await transcribeAudio(audioBuffer, filename)

      await job.updateProgress(90)
      // Delete raw audio from R2 immediately after transcription (GDPR / cost)
      await deleteFromR2(audioKey)

      await job.updateProgress(100)
      console.log(`[transcription] job ${job.id} done in ${transcriptionMs}ms`)

      return { transcript, transcriptionMs }
    },
    { connection: redis, concurrency: 3 },
  )
}
