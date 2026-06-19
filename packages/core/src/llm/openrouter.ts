import OpenAI from 'openai'
import { env } from '../environment.js'
import type { LLMProvider, LLMResult } from './types.js'
import { OPENROUTER_LLM_MODELS, DEFAULT_LLM_MODEL } from './openrouter-models.js'
import type { OpenRouterLLMModelKey } from './openrouter-models.js'

export class OpenRouterLLMProvider implements LLMProvider {
  private client: OpenAI
  private modelKey: OpenRouterLLMModelKey

  constructor(modelKey: OpenRouterLLMModelKey = DEFAULT_LLM_MODEL) {
    this.client = new OpenAI({
      apiKey: env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      timeout: 90_000,
      fetch: ((url: string, init?: RequestInit) =>
        fetch(url, (init?.body ? { ...init, duplex: 'half' } : init) as RequestInit)
      ) as unknown as NonNullable<ConstructorParameters<typeof OpenAI>[0]>['fetch'],
    })
    this.modelKey = modelKey
  }

  async generateChronicle(transcripts: string, systemPrompt: string): Promise<LLMResult> {
    const start = Date.now()
    const model = OPENROUTER_LLM_MODELS[this.modelKey]

    const response = await this.client.chat.completions.create({
      model: model.id,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcripts },
      ],
    })

    return {
      text: response.choices[0]?.message.content ?? '',
      durationMs: Date.now() - start,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      cacheReadTokens: 0,
    }
  }
}
