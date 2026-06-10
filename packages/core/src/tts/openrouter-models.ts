export interface OpenRouterTTSModel {
  id: string
  defaultVoice: string
  voices: Record<string, string> // flavour → voice name
}

export const OPENROUTER_TTS_MODELS = {
  // Lightweight, cheapest — $0.62/M chars. Single provider, no failover.
  'kokoro-82m': {
    id: 'hexgrad/kokoro-82m',
    defaultVoice: 'bm_george',
    voices: {
      medieval: 'bm_george', // British male — authoritative
      sports:   'am_adam',   // American male — energetic
      nature:   'bf_emma',   // British female — warm, gentle
      fantasy:  'af_bella',  // American female — expressive
    },
  },

  // OpenAI audio via OpenRouter — $0.60/M input + $2.40/M output tokens.
  // Output billed in audio tokens (~28 tokens/sec), not characters.
  'gpt-audio-mini': {
    id: 'openai/gpt-audio-mini',
    defaultVoice: 'onyx',
    voices: {
      medieval: 'onyx',    // deep, measured
      sports:   'echo',    // energetic
      nature:   'nova',    // warm, natural
      fantasy:  'shimmer', // expressive
    },
  },

  // Higher quality OpenAI audio — $2.50/M input + $10/M output tokens.
  'gpt-audio': {
    id: 'openai/gpt-audio',
    defaultVoice: 'onyx',
    voices: {
      medieval: 'onyx',
      sports:   'echo',
      nature:   'nova',
      fantasy:  'shimmer',
    },
  },
} satisfies Record<string, OpenRouterTTSModel>

export type OpenRouterTTSModelKey = keyof typeof OPENROUTER_TTS_MODELS

export const DEFAULT_TTS_MODEL: OpenRouterTTSModelKey = 'kokoro-82m'
