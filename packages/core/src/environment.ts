import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  PORT: z.coerce.number().default(3000),
  // Redis is only used by the API and worker — optional so the MCP server can start without it
  REDIS_URL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string(),
  OPENROUTER_BASE_URL: z.string().default('https://openrouter.ai/api/v1'),
  GROQ_API_KEY: z.string(),
  GROQ_BASE_URL: z.string().default('https://api.groq.com/openai/v1'),
  ELEVENLABS_API_KEY: z.string().optional(),
  // R2 is only used by the API and worker — optional so the MCP server can start without storage credentials
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
})

const result = schema.safeParse(process.env)

if (!result.success) {
  console.error('❌ Missing or invalid environment variables:')
  for (const [field, errors] of Object.entries(result.error.flatten().fieldErrors)) {
    console.error(`  ${field}: ${errors?.join(', ')}`)
  }
  process.exit(1)
}

export const env = result.data
