import createClient from 'openapi-fetch'
import type { paths } from './types.gen.js'

export const client = createClient<paths>({ baseUrl: '' })
