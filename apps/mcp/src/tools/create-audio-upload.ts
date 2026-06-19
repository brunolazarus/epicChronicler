import { randomUUID } from 'crypto'
import { getPresignedUploadUrl } from '@chronicler/core'
import { FLAVOUR_KEYS } from '@chronicler/core'

export const createAudioUploadToolDefinition = {
  name: 'create_audio_upload',
  description:
    'Creates a secure presigned upload URL for an audio file. Returns an uploadUrl and a fileId. Upload the file with: curl -X PUT -T <file> -H "Content-Type: <contentType>" "<uploadUrl>". Then call process_audio with the fileId.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      filename: {
        type: 'string',
        description: 'Original filename including extension (e.g. recording.mp3). Used to infer content type.',
      },
      flavour: {
        type: 'string',
        enum: FLAVOUR_KEYS,
        description: 'Narrative style to use when processing: medieval, sports, nature, or fantasy',
      },
    },
    required: ['filename', 'flavour'],
  },
}

const CONTENT_TYPE_MAP: Record<string, string> = {
  mp3: 'audio/mpeg',
  mp4: 'audio/mp4',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
  webm: 'audio/webm',
  ogg: 'audio/ogg',
  flac: 'audio/flac',
}

export async function handleCreateAudioUpload(args: Record<string, unknown>) {
  const filename = typeof args['filename'] === 'string' ? args['filename'] : undefined
  if (!filename) throw new Error('filename is required')

  const ext = filename.split('.').pop()?.toLowerCase() ?? 'mp3'
  const contentType = CONTENT_TYPE_MAP[ext] ?? 'audio/mpeg'

  const fileId = `mcp-${randomUUID()}.${ext}`
  const uploadUrl = await getPresignedUploadUrl(fileId, contentType, 900)

  return {
    fileId,
    uploadUrl,
    instructions: `PUT your audio file to uploadUrl with Content-Type: ${contentType}. Then call process_audio with fileId "${fileId}".`,
  }
}
