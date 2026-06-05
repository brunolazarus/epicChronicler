export const QueueName = {
  TRANSCRIPTION: 'transcription',
  CHRONICLE: 'chronicle',
} as const

export type QueueName = (typeof QueueName)[keyof typeof QueueName]

export const JobName = {
  TRANSCRIBE: 'transcribe',
  GENERATE: 'generate',
} as const

export type JobName = (typeof JobName)[keyof typeof JobName]
