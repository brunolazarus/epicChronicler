import { describe, it, expect } from 'vitest'
import { validateAudioFile } from '../validateAudioFile.js'

describe('validateAudioFile', () => {
  it('rejects files over 25MB', () => {
    const file = new File([new Uint8Array(26 * 1024 * 1024)], 'big.mp3', { type: 'audio/mpeg' })
    expect(validateAudioFile(file)).toEqual({
      ok: false,
      code: 'too-large',
      detail: expect.stringContaining('25'),
    })
  })

  it('rejects unsupported formats', () => {
    const file = new File(['bytes'], 'voice.aiff', { type: 'audio/aiff' })
    expect(validateAudioFile(file)).toEqual({ ok: false, code: 'unsupported-format', detail: 'aiff' })
  })

  it('accepts a supported format under the size limit', () => {
    const file = new File(['bytes'], 'recording.webm', { type: 'audio/webm' })
    expect(validateAudioFile(file)).toEqual({ ok: true })
  })
})
