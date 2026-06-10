export interface TranscriptionResult {
  transcript: string
  transcriptionMs: number
}

export interface TranscriptionProvider {
  transcribe(buffer: Buffer, filename: string): Promise<TranscriptionResult>
}
