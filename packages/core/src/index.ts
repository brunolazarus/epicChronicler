export { env } from './environment.js'

export { r2, uploadToR2, downloadFromR2, deleteFromR2 } from './r2.js'

export { redis } from './redis.js'

export { QueueName, JobName } from './queue-names.js'
export type { QueueName as QueueNameType, JobName as JobNameType } from './queue-names.js'

export type {
  TranscriptionJobData,
  TranscriptionJobResult,
  ChronicleJobData,
  ChronicleJobResult,
} from './queue-types.js'

export { FLAVOURS, FLAVOUR_KEYS, getFlavour } from './flavours/index.js'
export type { Flavour, FlavourKey } from './flavours/index.js'

export { transcribeAudio } from './transcription/index.js'
export type { TranscriptionProvider, TranscriptionResult } from './transcription/index.js'

export { generateChronicle } from './llm/index.js'
export type { LLMProvider, LLMResult } from './llm/index.js'

export { generateTTS } from './tts/index.js'
export type { TTSProvider, TTSResult } from './tts/index.js'
