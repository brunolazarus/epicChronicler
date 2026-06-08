import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'
import { env } from '../../environment.js'
import type { TTSProvider, TTSResult } from './types.js'

// Free pre-made voices — chosen to match each flavour's character
const FLAVOUR_VOICES: Record<string, string> = {
  medieval: 'pNInz6obpgDQGcFmaJgB', // Adam — deep, authoritative
  sports:   'TxGEqnHWrfWFTfGW9XjX', // Josh — energetic
  nature:   'EXAVITQu4vr4xnSDxMaL', // Bella — warm, gentle
  fantasy:  'MF3mGyEYCl7XYWbV9V6O', // Elli — expressive
}

const DEFAULT_VOICE = 'pNInz6obpgDQGcFmaJgB'

export class ElevenLabsTTSProvider implements TTSProvider {
  private client: ElevenLabsClient

  constructor() {
    this.client = new ElevenLabsClient({ apiKey: env.ELEVENLABS_API_KEY })
  }

  async generateSpeech(text: string, flavour: string): Promise<TTSResult> {
    const start = Date.now()
    const voiceId = FLAVOUR_VOICES[flavour] ?? DEFAULT_VOICE

    const stream = await this.client.textToSpeech.convert(voiceId, {
      text,
      modelId: 'eleven_multilingual_v2',
      outputFormat: 'mp3_44100_128',
    })

    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk))
    }

    return { audio: Buffer.concat(chunks), durationMs: Date.now() - start }
  }
}
