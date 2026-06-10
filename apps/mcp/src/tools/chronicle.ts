import { generateChronicle, generateTTS, getFlavour, FLAVOUR_KEYS } from '@chronicler/core'

export const chronicleToolDefinition = {
  name: 'generate_chronicle',
  description:
    'Rewrite one or more voice transcripts as a narrated chronicle in a chosen flavour (medieval, sports, nature, fantasy). Returns the chronicle text and a base64-encoded MP3 audio file.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      transcripts: {
        type: 'array',
        description: 'One or more transcripts to merge into a single chronicle.',
        items: {
          type: 'object',
          properties: {
            speaker: { type: 'string', description: 'Name or label for this contributor' },
            text: { type: 'string', description: 'The transcript text' },
          },
          required: ['speaker', 'text'],
        },
        minItems: 1,
      },
      flavour: {
        type: 'string',
        enum: FLAVOUR_KEYS,
        description: 'Narrative style: medieval, sports, nature, or fantasy',
      },
    },
    required: ['transcripts', 'flavour'],
  },
}

export async function handleChronicle(args: Record<string, unknown>) {
  const transcripts = args['transcripts']
  const flavour = args['flavour']

  if (!Array.isArray(transcripts) || typeof flavour !== 'string') {
    throw new Error('transcripts (array) and flavour (string) are required')
  }

  const flavourConfig = getFlavour(flavour)
  if (!flavourConfig) {
    throw new Error(`Unknown flavour "${flavour}". Valid options: ${FLAVOUR_KEYS.join(', ')}`)
  }

  const combined = (transcripts as Array<{ speaker: string; text: string }>)
    .map(({ speaker, text }) => `${speaker} said:\n${text}`)
    .join('\n\n---\n\n')

  const { text, durationMs: llmMs, inputTokens, outputTokens } =
    await generateChronicle(combined, flavourConfig.systemPrompt)

  const { audio, durationMs: ttsMs } = await generateTTS(text, flavour)

  return {
    text,
    audio_base64: audio.toString('base64'),
    llm_ms: llmMs,
    tts_ms: ttsMs,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
  }
}
