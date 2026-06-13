import { transcribeAudio } from '@chronicler/core'
import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'

export const transcribeToolDefinition = {
  name: 'transcribe_voice',
  description:
    'Transcribe a voice recording into text using Groq Whisper. Returns the transcript and how long transcription took. Provide audio as a local file path (audio_path, stdio only), a URL (audio_url, fetched by the server), or a base64-encoded string (audio_base64, small files only).',
  inputSchema: {
    type: 'object' as const,
    properties: {
      audio_path: {
        type: 'string',
        description: 'Absolute path to the audio file on the local filesystem. Only works with stdio transport.',
      },
      audio_url: {
        type: 'string',
        description: 'URL of an audio file the server will fetch. Use for remote/HTTP transport.',
      },
      audio_base64: {
        type: 'string',
        description: 'Base64-encoded audio file content. Suitable only for small files (<1MB).',
      },
      filename: {
        type: 'string',
        description: 'Original filename including extension (e.g. recording.mp3). Used to detect audio format. Inferred from audio_path if omitted.',
      },
    },
    required: [],
  },
}

export async function handleTranscribe(args: Record<string, unknown>) {
  const audioPath = typeof args['audio_path'] === 'string' ? args['audio_path'] : undefined
  const audioUrl = typeof args['audio_url'] === 'string' ? args['audio_url'] : undefined
  const audioBase64 = typeof args['audio_base64'] === 'string' ? args['audio_base64'] : undefined

  const filename =
    typeof args['filename'] === 'string'
      ? args['filename']
      : audioPath
        ? basename(audioPath)
        : undefined

  if (!filename) {
    throw new Error('filename is required when using audio_url or audio_base64')
  }

  let buffer: Buffer
  if (audioPath) {
    buffer = await readFile(audioPath)
  } else if (audioUrl) {
    const response = await fetch(audioUrl)
    if (!response.ok) throw new Error(`Failed to fetch audio from URL: ${response.status} ${response.statusText}`)
    buffer = Buffer.from(await response.arrayBuffer())
  } else if (audioBase64) {
    buffer = Buffer.from(audioBase64, 'base64')
  } else {
    throw new Error('One of audio_path, audio_url, or audio_base64 is required')
  }

  const { transcript, transcriptionMs } = await transcribeAudio(buffer, filename)

  return {
    transcript,
    transcription_ms: transcriptionMs,
  }
}
