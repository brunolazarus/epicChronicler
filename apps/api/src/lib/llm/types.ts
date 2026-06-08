export interface LLMResult {
  text: string
  durationMs: number
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
}

export interface LLMProvider {
  generateChronicle(transcripts: string, systemPrompt: string): Promise<LLMResult>
}
