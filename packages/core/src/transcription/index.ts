import { GroqTranscriptionProvider } from './groq.js'

const provider = new GroqTranscriptionProvider()

export const transcribeAudio = provider.transcribe.bind(provider)
export type { TranscriptionProvider, TranscriptionResult } from './types.js'
