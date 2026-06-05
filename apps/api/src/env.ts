import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  PORT: z.coerce.number().default(3000),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  OPENAI_API_KEY: z.string(),
  ANTHROPIC_API_KEY: z.string(),
  R2_ACCOUNT_ID: z.string(),
  R2_ACCESS_KEY_ID: z.string(),
  R2_SECRET_ACCESS_KEY: z.string(),
  R2_BUCKET_NAME: z.string(),
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
