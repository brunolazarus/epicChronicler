import OpenAI from 'openai'
import { env } from '../../environment.js'
import type { LLMProvider, LLMResult } from './types.js'

export class OpenRouterLLMProvider implements LLMProvider {
  private client: OpenAI

  constructor() {
    this.client = new OpenAI({
      apiKey: env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
    })
  }

  async generateChronicle(transcripts: string, systemPrompt: string): Promise<LLMResult> {
    const start = Date.now()

    const response = await this.client.chat.completions.create({
      model: 'anthropic/claude-sonnet-4-5',
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
