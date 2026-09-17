import { describe, it, expect } from 'vitest'
import { validateAudioFile } from '../validateAudioFile.js'

describe('validateAudioFile', () => {
  it('rejects files over 25MB', () => {
    const file = new File([new Uint8Array(26 * 1024 * 1024)], 'big.mp3', { type: 'audio/mpeg' })
    expect(validateAudioFile(file)).toEqual({
      ok: false,
      code: 'too-large',
      fileName: 'big.mp3',
      value: '26.0 MB',
      limit: 'limit 25 MB',
    })
  })

  it('rejects unsupported formats', () => {
    const file = new File(['bytes'], 'voice.aiff', { type: 'audio/aiff' })
    expect(validateAudioFile(file)).toEqual({
      ok: false,
      code: 'unsupported-format',
      fileName: 'voice.aiff',
      value: 'aiff',
      limit: 'webm · mp3 · mp4 · m4a · wav · ogg',
    })
  })

  it('accepts a supported format under the size limit', () => {
    const file = new File(['bytes'], 'recording.webm', { type: 'audio/webm' })
    expect(validateAudioFile(file)).toEqual({ ok: true })
  })

  it('accepts mp4 — what iOS Safari\'s MediaRecorder actually produces', () => {
    const file = new File(['bytes'], 'recording.mp4', { type: 'audio/mp4' })
    expect(validateAudioFile(file)).toEqual({ ok: true })
  })
})
