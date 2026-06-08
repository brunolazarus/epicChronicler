export interface TTSResult {
  audio: Buffer
  durationMs: number
}

export interface TTSProvider {
  generateSpeech(text: string, flavour: string): Promise<TTSResult>
}
