import { describe, it, expect } from 'vitest'
import { buildScene } from '../scenes.js'

describe('buildScene', () => {
  it('returns a non-empty shape list for every flavour', () => {
    for (const key of ['medieval', 'sports', 'nature', 'fantasy'] as const) {
      const shapes = buildScene(key)
      expect(shapes.length).toBeGreaterThan(5)
    }
  })
})
