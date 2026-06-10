import OpenAI, { toFile } from 'openai'
import { env } from '../environment.js'
import type { TranscriptionProvider, TranscriptionResult } from './types.js'

const MIME_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg',
  mp4: 'audio/mp4',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
  webm: 'audio/webm',
  ogg: 'audio/ogg',
  flac: 'audio/flac',
}

export class GroqTranscriptionProvider implements TranscriptionProvider {
  private client: OpenAI

  constructor() {
    this.client = new OpenAI({
      apiKey: env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    })
  }

  async transcribe(buffer: Buffer, filename: string): Promise<TranscriptionResult> {
    const ext = filename.split('.').pop()?.toLowerCase() ?? 'mp3'
    const mimeType = MIME_TYPES[ext] ?? 'audio/mpeg'
    const start = Date.now()

    const transcription = await this.client.audio.transcriptions.create({
      file: await toFile(buffer, filename, { type: mimeType }),
      model: 'whisper-large-v3-turbo',
    })

    return { transcript: transcription.text, transcriptionMs: Date.now() - start }
  }
}
