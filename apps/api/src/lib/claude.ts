import Anthropic from '@anthropic-ai/sdk'
import { env } from '../env.js'

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

export interface ChronicleResult {
  text: string
  durationMs: number
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
}

export async function generateChronicle(
  transcripts: string,
  systemPrompt: string,
): Promise<ChronicleResult> {
  const start = Date.now()

  // Use the beta prompt caching endpoint so the system prompt is cached across
  // repeated calls with the same flavour — reduces cost and latency significantly.
  const response = await anthropic.beta.promptCaching.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: transcripts }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  return {
    text,
    durationMs: Date.now() - start,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
  }
}
