import { Worker } from 'bullmq'
import { getRedis, downloadFromR2, deleteFromR2, transcribeAudio, QueueName } from '@chronicler/core'
import type { TranscriptionJobData, TranscriptionJobResult, JobNameType } from '@chronicler/core'

export function createTranscriptionWorker() {
  return new Worker<TranscriptionJobData, TranscriptionJobResult, JobNameType>(
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
    { connection: getRedis(), concurrency: 3 },
  )
}
