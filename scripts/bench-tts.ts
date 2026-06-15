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

async function main() {
  const times: number[] = []
  for (let i = 1; i <= 3; i++) {
    times.push(await benchTTS(i))
  }
  const avg = Math.round(times.reduce((a, b) => a + b) / times.length)
  console.log(`\nmin: ${Math.min(...times)}ms  max: ${Math.max(...times)}ms  avg: ${avg}ms`)
}

main()
