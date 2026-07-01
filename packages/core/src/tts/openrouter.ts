import OpenAI from 'openai'
import { env } from '../environment.js'
import type { TTSProvider, TTSResult } from './types.js'
import { OPENROUTER_TTS_MODELS, DEFAULT_TTS_MODEL } from './openrouter-models.js'
import type { OpenRouterTTSModelKey } from './openrouter-models.js'

export class OpenRouterTTSProvider implements TTSProvider {
  private client: OpenAI
  private modelKey: OpenRouterTTSModelKey

  constructor(modelKey: OpenRouterTTSModelKey = DEFAULT_TTS_MODEL) {
    this.client = new OpenAI({
      apiKey: env.OPENROUTER_API_KEY,
      baseURL: env.OPENROUTER_BASE_URL,
      timeout: 90_000,
      fetch: ((url: string, init?: RequestInit) =>
        fetch(url, (init?.body ? { ...init, duplex: 'half' } : init) as RequestInit)
      ) as unknown as NonNullable<ConstructorParameters<typeof OpenAI>[0]>['fetch'],
    })
    this.modelKey = modelKey
  }

  async generateSpeech(text: string, flavour: string): Promise<TTSResult> {
    const start = Date.now()
    const model = OPENROUTER_TTS_MODELS[this.modelKey]
    const voice = (model.voices as Record<string, string>)[flavour] ?? model.defaultVoice

    const response = await this.client.audio.speech.create({
      model: model.id,
      voice: voice as Parameters<typeof this.client.audio.speech.create>[0]['voice'],
      input: text,
      response_format: 'mp3',
    })

    const audio = Buffer.from(await response.arrayBuffer())
    return { audio, durationMs: Date.now() - start }
  }
}
