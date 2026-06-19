export const QueueName = {
  TRANSCRIPTION: 'transcription',
  CHRONICLE: 'chronicle',
  PIPELINE: 'pipeline',
} as const

export type QueueName = (typeof QueueName)[keyof typeof QueueName]

export const JobName = {
  TRANSCRIBE: 'transcribe',
  GENERATE: 'generate',
  PROCESS: 'process',
} as const

export type JobName = (typeof JobName)[keyof typeof JobName]
