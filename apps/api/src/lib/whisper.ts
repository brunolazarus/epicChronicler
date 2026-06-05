import OpenAI, { toFile } from 'openai'
import { env } from '../env.js'

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

const MIME_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg',
  mp4: 'audio/mp4',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
  webm: 'audio/webm',
  ogg: 'audio/ogg',
  flac: 'audio/flac',
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string,
): Promise<{ transcript: string; transcriptionMs: number }> {
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'mp3'
  const mimeType = MIME_TYPES[ext] ?? 'audio/mpeg'
  const start = Date.now()

  const transcription = await openai.audio.transcriptions.create({
    file: await toFile(audioBuffer, filename, { type: mimeType }),
    model: 'whisper-1',
  })

  return { transcript: transcription.text, transcriptionMs: Date.now() - start }
}
