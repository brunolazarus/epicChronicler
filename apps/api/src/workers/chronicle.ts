import { Worker } from 'bullmq'
import { randomUUID } from 'crypto'
import { redis } from '../lib/redis.js'
import { uploadToR2 } from '../lib/r2.js'
import { generateChronicle } from '../lib/llm/index.js'
import { generateTTS } from '../lib/tts/index.js'
import { getFlavour } from '../flavours/index.js'
import type { ChronicleJobData, ChronicleJobResult } from '../queues/index.js'
import { QueueName, type JobName } from '../queues/names.js'

export function createChronicleWorker() {
  return new Worker<ChronicleJobData, ChronicleJobResult, JobName>(
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
