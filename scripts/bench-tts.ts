import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import OpenAI from 'openai'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env') })

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
})

const TEXT = `In the year of our Lord, a great gathering took place. The companions assembled at the crossroads, their voices rising with tales of distant travels and forgotten roads.`

async function benchTTS(run: number): Promise<number> {
  const start = Date.now()
  process.stderr.write(`[run ${run}] starting...\n`)

  const response = await client.audio.speech.create({
    model: 'hexgrad/kokoro-82m',
    voice: 'bm_george' as never,
    input: TEXT,
    response_format: 'mp3',
  })

  await response.arrayBuffer()
  const ms = Date.now() - start
  console.log(`[run ${run}] ${ms}ms`)
  return ms
}

async function benchLLM(run: number): Promise<number> {
  const start = Date.now()
  process.stderr.write(`[llm run ${run}] starting...\n`)

  const response = await client.chat.completions.create({
    model: 'anthropic/claude-sonnet-4-5',
    max_tokens: 256,
    messages: [
      { role: 'system', content: 'You are a medieval chronicler.' },
      { role: 'user', content: 'Write one sentence about a gathering of friends.' },
    ],
  })

  const ms = Date.now() - start
  console.log(`[llm run ${run}] ${ms}ms — "${response.choices[0]?.message.content?.slice(0, 60)}..."`)
  return ms
}

async function main() {
  console.log('--- TTS ---')
  const ttsTimes: number[] = []
  for (let i = 1; i <= 3; i++) ttsTimes.push(await benchTTS(i))
  const ttsAvg = Math.round(ttsTimes.reduce((a, b) => a + b) / ttsTimes.length)
  console.log(`min: ${Math.min(...ttsTimes)}ms  max: ${Math.max(...ttsTimes)}ms  avg: ${ttsAvg}ms`)

  console.log('\n--- LLM ---')
  const llmTimes: number[] = []
  for (let i = 1; i <= 2; i++) llmTimes.push(await benchLLM(i))
  const llmAvg = Math.round(llmTimes.reduce((a, b) => a + b) / llmTimes.length)
  console.log(`min: ${Math.min(...llmTimes)}ms  max: ${Math.max(...llmTimes)}ms  avg: ${llmAvg}ms`)
}

main()
