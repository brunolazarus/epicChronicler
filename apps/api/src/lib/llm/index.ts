import { OpenRouterLLMProvider } from './openrouter.js'

const provider = new OpenRouterLLMProvider()

export const generateChronicle = provider.generateChronicle.bind(provider)
export type { LLMProvider, LLMResult } from './types.js'
