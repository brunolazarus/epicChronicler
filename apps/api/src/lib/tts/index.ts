import { OpenRouterTTSProvider } from './openrouter.js'

const provider = new OpenRouterTTSProvider()

export const generateTTS = provider.generateSpeech.bind(provider)
export type { TTSProvider, TTSResult } from './types.js'
