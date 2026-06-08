import OpenAI from 'openai'
import { env } from '../../environment.js'
import type { TTSProvider, TTSResult } from './types.js'

// Kokoro 82M voice names (language_gender_name format)
const FLAVOUR_VOICES: Record<string, string> = {
  medieval: 'bm_george', // British male — authoritative
  sports:   'am_adam',   // American male — energetic
  nature:   'bf_emma',   // British female — warm, gentle
  fantasy:  'af_bella',  // American female — expressive
}

export class OpenRouterTTSProvider implements TTSProvider {
  private client: OpenAI

  constructor() {
    this.client = new OpenAI({
      apiKey: env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
    })
  }

  async generateSpeech(text: string, flavour: string): Promise<TTSResult> {
    const start = Date.now()

    const response = await this.client.audio.speech.create({
      model: 'hexgrad/kokoro-82m',
      voice: (FLAVOUR_VOICES[flavour] ?? 'bm_george') as Parameters<typeof this.client.audio.speech.create>[0]['voice'],
      input: text,
      response_format: 'mp3',
    })

    const audio = Buffer.from(await response.arrayBuffer())
    return { audio, durationMs: Date.now() - start }
  }
}
