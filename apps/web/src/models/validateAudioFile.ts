const MAX_BYTES = 25 * 1024 * 1024
const SUPPORTED_EXTENSIONS = ['webm', 'mp3', 'mp4', 'm4a', 'wav', 'ogg']

export type AudioValidation =
  | { ok: true }
  | { ok: false; code: 'too-large' | 'unsupported-format'; fileName: string; value: string; limit: string }

export function validateAudioFile(file: File): AudioValidation {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''

  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      code: 'too-large',
      fileName: file.name,
      value: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      limit: 'limit 25 MB',
    }
  }
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    return {
      ok: false,
      code: 'unsupported-format',
      fileName: file.name,
      value: ext,
      limit: 'webm · mp3 · mp4 · m4a · wav · ogg',
    }
  }
  return { ok: true }
}
