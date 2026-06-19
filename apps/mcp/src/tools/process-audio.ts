import { randomUUID } from 'crypto'
import { Queue } from 'bullmq'
import { getRedis, getPresignedDownloadUrl, QueueName, JobName, FLAVOUR_KEYS } from '@chronicler/core'
import type { PipelineJobData, PipelineJobResult, JobNameType } from '@chronicler/core'

function getPipelineQueue() {
  return new Queue<PipelineJobData, PipelineJobResult, JobNameType>(QueueName.PIPELINE, {
    connection: getRedis(),
    defaultJobOptions: { attempts: 2, backoff: { type: 'exponential', delay: 3000 } },
  })
}

// --- process_audio -----------------------------------------------------------

export const processAudioToolDefinition = {
  name: 'process_audio',
  description:
    'Enqueues an uploaded audio file for full pipeline processing: transcription → chronicle → TTS. Returns a jobId to poll with get_audio_job.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      file_id: {
        type: 'string',
        description: 'The fileId returned by create_audio_upload after the upload is complete.',
      },
      flavour: {
        type: 'string',
        enum: FLAVOUR_KEYS,
        description: 'Narrative style: medieval, sports, nature, or fantasy',
      },
      speaker: {
        type: 'string',
        description: 'Name or label for the speaker. Defaults to "Narrator".',
      },
    },
    required: ['file_id', 'flavour'],
  },
}

export async function handleProcessAudio(args: Record<string, unknown>) {
  const fileId = typeof args['file_id'] === 'string' ? args['file_id'] : undefined
  const flavour = typeof args['flavour'] === 'string' ? args['flavour'] : undefined
  const speaker = typeof args['speaker'] === 'string' ? args['speaker'] : 'Narrator'

  if (!fileId) throw new Error('file_id is required')
  if (!flavour) throw new Error('flavour is required')

  const filename = fileId.split('/').pop() ?? fileId

  const queue = getPipelineQueue()
  const job = await queue.add(
    JobName.PROCESS,
    { audioKey: fileId, filename, flavour, speaker, requestedAt: new Date().toISOString() },
    { jobId: randomUUID(), removeOnComplete: 100, removeOnFail: 50 },
  )
  await queue.close()

  return {
    jobId: job.id!,
    status: 'queued',
    message: `Job enqueued. Call get_audio_job with jobId "${job.id}" to poll for the result.`,
  }
}

// --- get_audio_job -----------------------------------------------------------

export const getAudioJobToolDefinition = {
  name: 'get_audio_job',
  description:
    'Polls a pipeline job enqueued by process_audio. Returns status and progress while running. When completed, returns the chronicle text and a presigned audio_url (valid 1 hour) to download the MP3. After receiving a completed result, save the audio file locally using: curl -L -o ~/Downloads/chronicle.mp3 "<audio_url>"',
  inputSchema: {
    type: 'object' as const,
    properties: {
      job_id: {
        type: 'string',
        description: 'The jobId returned by process_audio.',
      },
    },
    required: ['job_id'],
  },
}

export async function handleGetAudioJob(args: Record<string, unknown>) {
  const jobId = typeof args['job_id'] === 'string' ? args['job_id'] : undefined
  if (!jobId) throw new Error('job_id is required')

  const queue = getPipelineQueue()
  const job = await queue.getJob(jobId)
  await queue.close()

  if (!job) throw new Error(`Job ${jobId} not found`)

  const state = await job.getState()

  if (state !== 'completed') {
    return {
      jobId,
      status: state,
      progress: job.progress as number,
      result: null,
    }
  }

  const result = job.returnvalue as PipelineJobResult
  const audioUrl = await getPresignedDownloadUrl(result.audioKey, 3600)

  return {
    jobId,
    status: 'completed',
    progress: 100,
    result: {
      transcript: result.transcript,
      chronicle: result.chronicle,
      audio_url: audioUrl,
      transcription_ms: result.transcriptionMs,
      llm_ms: result.llmMs,
      tts_ms: result.ttsMs,
      total_ms: result.totalMs,
    },
  }
}
