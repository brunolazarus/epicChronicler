import { Worker } from 'bullmq'
import { getRedis, downloadFromR2, deleteFromR2, transcribeAudio, QueueName, QueuePrefix } from '@chronicler/core'
import type { TranscriptionJobData, TranscriptionJobResult, JobNameType } from '@chronicler/core'

export function createTranscriptionWorker() {
  const worker = new Worker<TranscriptionJobData, TranscriptionJobResult, JobNameType>(
    QueueName.TRANSCRIPTION,
    async (job) => {
      const { audioKey, filename } = job.data
      console.log(`[web:transcription] job ${job.id} start — audioKey: ${audioKey}, filename: ${filename}`)

      await job.updateProgress(10)
      const audioBuffer = await downloadFromR2(audioKey)
      console.log(`[web:transcription] job ${job.id} downloaded ${audioBuffer.byteLength} bytes from R2`)

      await job.updateProgress(40)
      const { transcript, transcriptionMs } = await transcribeAudio(audioBuffer, filename)

      await job.updateProgress(90)
      await deleteFromR2(audioKey)

      await job.updateProgress(100)
      console.log(`[web:transcription] job ${job.id} done in ${transcriptionMs}ms`)

      return { transcript, transcriptionMs }
    },
    { connection: getRedis(), concurrency: 3, prefix: QueuePrefix.WEB },
  )

  worker.on('failed', (job, err) => {
    console.error(`[web:transcription] job ${job?.id} failed:`, err)
  })

  return worker
}
