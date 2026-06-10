export interface TranscriptionJobData {
  audioKey: string
  filename: string
  uploadedAt: string
}

export interface TranscriptionJobResult {
  transcript: string
  transcriptionMs: number
}

export interface ChronicleJobData {
  transcripts: Array<{ speaker: string; text: string }>
  flavour: string
  requestedAt: string
}

export interface ChronicleJobResult {
  text: string
  audioKey: string
  llmMs: number
  ttsMs: number
  totalMs: number
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
}
