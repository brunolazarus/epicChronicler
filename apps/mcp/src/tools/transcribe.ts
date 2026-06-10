import { transcribeAudio } from '@chronicler/core'

export const transcribeToolDefinition = {
  name: 'transcribe_voice',
  description:
    'Transcribe a voice recording into text using Groq Whisper. Returns the transcript and how long transcription took.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      audio_base64: {
        type: 'string',
        description: 'Base64-encoded audio file content',
      },
      filename: {
        type: 'string',
        description: 'Original filename including extension (e.g. recording.mp3). Used to detect audio format.',
      },
    },
    required: ['audio_base64', 'filename'],
  },
}

export async function handleTranscribe(args: Record<string, unknown>) {
  const audioBase64 = args['audio_base64']
  const filename = args['filename']

  if (typeof audioBase64 !== 'string' || typeof filename !== 'string') {
    throw new Error('audio_base64 and filename are required strings')
  }

  const buffer = Buffer.from(audioBase64, 'base64')
  const { transcript, transcriptionMs } = await transcribeAudio(buffer, filename)

  return {
    transcript,
    transcription_ms: transcriptionMs,
  }
}
