import { FLAVOUR_KEYS } from '@chronicler/core'
import { handleTranscribe } from './transcribe.js'
import { handleChronicle } from './chronicle.js'

export const voiceToChronicleToolDefinition = {
  name: 'voice_to_chronicle',
  description:
    'Full pipeline in one call: transcribes a voice recording, then rewrites it as a narrated chronicle in the chosen flavour. Returns the transcript, the chronicle text, and a base64-encoded MP3 audio file.',
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
      flavour: {
        type: 'string',
        enum: FLAVOUR_KEYS,
        description: 'Narrative style: medieval, sports, nature, or fantasy',
      },
      speaker: {
        type: 'string',
        description: 'Name or label for the person who recorded this. Defaults to "Narrator".',
      },
    },
    required: ['audio_base64', 'filename', 'flavour'],
  },
}

export async function handleVoiceToChronicle(args: Record<string, unknown>) {
  const speaker = typeof args['speaker'] === 'string' ? args['speaker'] : 'Narrator'

  const { transcript, transcription_ms } = await handleTranscribe(args)

  const chronicle = await handleChronicle({
    transcripts: [{ speaker, text: transcript }],
    flavour: args['flavour'],
  })

  return {
    transcript,
    transcription_ms,
    ...chronicle,
  }
}
