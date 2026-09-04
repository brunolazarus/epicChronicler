import createClient from 'openapi-fetch'
import type { paths, components } from './types.gen.js'

export const client = createClient<paths>({ baseUrl: '' })

export type { paths, components } from './types.gen.js'

export type TranscriptionJobResult = components['schemas']['TranscriptionJobResult']
export type ChronicleJobResult = components['schemas']['ChronicleJobResult']

type Json<T> = T extends { content: { 'application/json': infer B } } ? B : never

export type JobStatus = Json<
  paths['/api/v1/pipeline/jobs/{id}']['get']['responses']['200']
>
export type Flavour = Json<
  paths['/api/v1/pipeline/flavours']['get']['responses']['200']
>[number]
