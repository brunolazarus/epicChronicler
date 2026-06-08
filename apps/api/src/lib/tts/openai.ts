import OpenAI from 'openai'
import { env } from '../../environment.js'
import type { TTSProvider, TTSResult } from './types.js'

type Voice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'

const FLAVOUR_VOICES: Record<string, Voice> = {
  medieval: 'onyx',
  sports: 'echo',
  nature: 'fable',
  fantasy: 'nova',
}

export class OpenAITTSProvider implements TTSProvider {
  private client: OpenAI

  constructor() {
    this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY })
  }

  async generateSpeech(text: string, flavour: string): Promise<TTSResult> {
    const start = Date.now()

    const response = await this.client.audio.speech.create({
      model: 'tts-1-hd',
      voice: FLAVOUR_VOICES[flavour] ?? 'onyx',
      input: text,
    })

    const audio = Buffer.from(await response.arrayBuffer())
    return { audio, durationMs: Date.now() - start }
  }
}
