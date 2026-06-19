import { Worker } from 'bullmq'
import { randomUUID } from 'crypto'
import {
  getRedis,
  downloadFromR2,
  deleteFromR2,
  uploadToR2,
  transcribeAudio,
  generateChronicle,
  generateTTS,
  getFlavour,
  QueueName,
  QueuePrefix,
} from '@chronicler/core'
import type { PipelineJobData, PipelineJobResult, JobNameType } from '@chronicler/core'

export function createPipelineWorker() {
  return new Worker<PipelineJobData, PipelineJobResult, JobNameType>(
    QueueName.PIPELINE,
    async (job) => {
      const { audioKey, filename, flavour, speaker } = job.data
      const start = Date.now()

      const flavourConfig = getFlavour(flavour)
      if (!flavourConfig) throw new Error(`Unknown flavour: ${flavour}`)

      await job.updateProgress(5)
      const audioBuffer = await downloadFromR2(audioKey)

      await job.updateProgress(15)
      const { transcript, transcriptionMs } = await transcribeAudio(audioBuffer, filename)

      await job.updateProgress(40)
      await deleteFromR2(audioKey)

      const combined = `${speaker} said:\n${transcript}`
      const { text: chronicle, durationMs: llmMs } = await generateChronicle(combined, flavourConfig.systemPrompt)

      await job.updateProgress(75)

      const { audio, durationMs: ttsMs } = await generateTTS(chronicle, flavour)

      await job.updateProgress(90)
      const ttsKey = `tts-${randomUUID()}.mp3`
      await uploadToR2(ttsKey, audio, 'audio/mpeg')

      await job.updateProgress(100)
      const totalMs = Date.now() - start
      console.log(`[mcp:pipeline] job ${job.id} done in ${totalMs}ms`)

      return { transcript, chronicle, audioKey: ttsKey, transcriptionMs, llmMs, ttsMs, totalMs }
    },
    { connection: getRedis(), concurrency: 2, stalledInterval: 120_000, prefix: QueuePrefix.MCP },
  )
}
