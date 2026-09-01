const MAX_BYTES = 25 * 1024 * 1024
const SUPPORTED_EXTENSIONS = ['webm', 'mp3', 'm4a', 'wav', 'ogg']

export type AudioValidation = { ok: true } | { ok: false; code: 'too-large' | 'unsupported-format'; detail: string }

export function validateAudioFile(file: File): AudioValidation {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''

  if (file.size > MAX_BYTES) {
    return { ok: false, code: 'too-large', detail: `${(file.size / 1024 / 1024).toFixed(1)} MB — limit 25 MB` }
  }
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    return { ok: false, code: 'unsupported-format', detail: ext }
  }
  return { ok: true }
}
