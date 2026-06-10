import { Worker } from 'bullmq'
import { randomUUID } from 'crypto'
import { redis, uploadToR2, generateChronicle, generateTTS, getFlavour, QueueName } from '@chronicler/core'
import type { ChronicleJobData, ChronicleJobResult, JobNameType } from '@chronicler/core'

export function createChronicleWorker() {
  return new Worker<ChronicleJobData, ChronicleJobResult, JobNameType>(
    QueueName.CHRONICLE,
    async (job) => {
      const { transcripts, flavour } = job.data
      const start = Date.now()

      const flavourConfig = getFlavour(flavour)
      if (!flavourConfig) throw new Error(`Unknown flavour: ${flavour}`)

      await job.updateProgress(10)

      const combined = transcripts
        .map(({ speaker, text }) => `${speaker} said:\n${text}`)
        .join('\n\n---\n\n')

      const { text, durationMs: llmMs, inputTokens, outputTokens, cacheReadTokens } =
        await generateChronicle(combined, flavourConfig.systemPrompt)

      await job.updateProgress(60)
      console.log(
        `[chronicle] LLM done in ${llmMs}ms — ${inputTokens} in / ${outputTokens} out / ${cacheReadTokens} cache-read tokens`,
      )

      const { audio, durationMs: ttsMs } = await generateTTS(text, flavour)
      await job.updateProgress(85)

      const audioKey = `tts-${randomUUID()}.mp3`
      await uploadToR2(audioKey, audio, 'audio/mpeg')
      await job.updateProgress(100)

      const totalMs = Date.now() - start
      console.log(`[chronicle] job ${job.id} done in ${totalMs}ms`)

      return { text, audioKey, llmMs, ttsMs, totalMs, inputTokens, outputTokens, cacheReadTokens }
    },
    { connection: redis, concurrency: 2 },
  )
}
