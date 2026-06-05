import OpenAI from 'openai'
import { env } from '../env.js'

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

type Voice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'

// Each flavour gets a distinct voice to reinforce its character
const FLAVOUR_VOICES: Record<string, Voice> = {
  medieval: 'onyx',   // deep, authoritative
  sports: 'echo',     // energetic
  nature: 'fable',    // warm, gentle
  fantasy: 'nova',    // expressive
}

export async function generateTTS(
  text: string,
  flavour: string,
): Promise<{ audio: Buffer; durationMs: number }> {
  const start = Date.now()

  const response = await openai.audio.speech.create({
    model: 'tts-1-hd',
    voice: FLAVOUR_VOICES[flavour] ?? 'onyx',
    input: text,
  })

  const audio = Buffer.from(await response.arrayBuffer())
  return { audio, durationMs: Date.now() - start }
}
