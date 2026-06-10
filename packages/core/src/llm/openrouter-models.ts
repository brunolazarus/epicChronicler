export interface OpenRouterLLMModel {
  id: string
  description: string // tradeoff summary
}

export const OPENROUTER_LLM_MODELS = {
  // Anthropic Claude Sonnet 4.5 — $15/M out. Current default, highest quality.
  'claude-sonnet-4-5': {
    id: 'anthropic/claude-sonnet-4-5',
    description: 'Current default, highest quality — $15/M out',
  },

  // Anthropic Claude 3.5 Haiku — $4/M out. Good quality, 3.75× cheaper than Sonnet.
  'claude-3-5-haiku': {
    id: 'anthropic/claude-3.5-haiku',
    description: 'Good quality, 3.75× cheaper than Sonnet — $4/M out',
  },

  // Google Gemini 2.5 Flash — $2.50/M out. Fast, multi-provider.
  'gemini-2-5-flash': {
    id: 'google/gemini-2.5-flash',
    description: 'Fast, multi-provider — $2.50/M out',
  },

  // Google Gemini 2.5 Flash Lite — $0.40/M out. Cheapest, quality unvalidated.
  'gemini-2-5-flash-lite': {
    id: 'google/gemini-2.5-flash-lite',
    description: 'Cheapest option, quality unvalidated — $0.40/M out',
  },

  // OpenAI GPT-4o Mini — $0.60/M out. Proven, reliable.
  'gpt-4o-mini': {
    id: 'openai/gpt-4o-mini',
    description: 'Proven, reliable — $0.60/M out',
  },
} satisfies Record<string, OpenRouterLLMModel>

export type OpenRouterLLMModelKey = keyof typeof OPENROUTER_LLM_MODELS

export const DEFAULT_LLM_MODEL: OpenRouterLLMModelKey = 'claude-sonnet-4-5'
