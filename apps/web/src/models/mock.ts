import type { Flavour, JobStatus, TranscriptionJobResult, ChronicleJobResult } from '@chronicler/api-client'

// Master switch: when set, every model hook resolves from the canned data below instead of
// calling the real API — lets the app run stage-to-stage on `vite dev` alone, no backend needed.
export const MOCK_API = import.meta.env.VITE_MOCK_API === 'true'

export const MOCK_FLAVOURS: Flavour[] = [
  { key: 'medieval', name: 'Medieval Chronicler', description: 'A solemn scribe recording events for posterity' },
  { key: 'sports', name: 'Sports Commentator', description: 'An energetic play-by-play announcer who sees drama in everything' },
  { key: 'nature', name: 'Nature Documentary', description: 'A hushed, reverent narrator observing human behaviour in the wild' },
  { key: 'fantasy', name: 'Epic Fantasy Bard', description: 'A legendary storyteller who turns every tale into legend' },
]

const MOCK_TRANSCRIPT = 'We got lost on the trail near the old bridge and found a strange stone marker.'

const MOCK_CHRONICLE_TEXT = `Here follows the chronicle of the fellowship who ventured forth unto the trail nigh the ancient bridge, wherein they did encounter marvels most curious.

In the times whereof we write, the company found themselves cast into uncertainty, knowing not which way to turn nor whence they had come.

Let all who hear this account remember that even in wandering, discoveries await the faithful traveler.`

// Job IDs are opaque strings once real, so tag mock ones to tell useJobPoll which canned
// result shape to hand back — the hook itself doesn't otherwise know what it's polling for.
let mockJobCounter = 0

export function mockUploadJobId(): string {
  mockJobCounter += 1
  return `mock-upload-${mockJobCounter}`
}

export function mockGenerateJobId(): string {
  mockJobCounter += 1
  return `mock-generate-${mockJobCounter}`
}

export function mockJobStatus(jobId: string): JobStatus {
  if (jobId.startsWith('mock-upload-')) {
    const result: TranscriptionJobResult = { transcript: MOCK_TRANSCRIPT, transcriptionMs: 420 }
    return { id: jobId, queue: 'transcription', status: 'completed', progress: 100, result, error: null }
  }
  // audioKey is deliberately empty — both AudioPlayer and ChronicleFooter's download link
  // already treat a falsy audioKey as "no audio yet", so this skips needing a real mock file.
  const result: ChronicleJobResult = {
    text: MOCK_CHRONICLE_TEXT, audioKey: '', llmMs: 0, ttsMs: 0, totalMs: 0,
    inputTokens: 0, outputTokens: 0, cacheReadTokens: 0,
  }
  return { id: jobId, queue: 'chronicle', status: 'completed', progress: 100, result, error: null }
}
