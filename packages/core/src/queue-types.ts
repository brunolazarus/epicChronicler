import { z } from 'zod'

export interface TranscriptionJobData {
  audioKey: string
  filename: string
  uploadedAt: string
}

export const TranscriptionJobResultSchema = z.object({
  transcript: z.string(),
  transcriptionMs: z.number(),
})
export type TranscriptionJobResult = z.infer<typeof TranscriptionJobResultSchema>

export interface ChronicleJobData {
  transcripts: Array<{ speaker: string; text: string }>
  flavour: string
  requestedAt: string
}

export const ChronicleJobResultSchema = z.object({
  text: z.string(),
  audioKey: z.string(),
  llmMs: z.number(),
  ttsMs: z.number(),
  totalMs: z.number(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheReadTokens: z.number(),
})
export type ChronicleJobResult = z.infer<typeof ChronicleJobResultSchema>

export interface PipelineJobData {
  audioKey: string
  filename: string
  flavour: string
  speaker: string
  requestedAt: string
}

export interface PipelineJobResult {
  transcript: string
  chronicle: string
  audioKey: string
  transcriptionMs: number
  llmMs: number
  ttsMs: number
  totalMs: number
}
