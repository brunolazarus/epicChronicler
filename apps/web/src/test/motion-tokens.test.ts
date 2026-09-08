/// <reference types="vitest" />
/// @vitest-environment node

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const css = readFileSync(fileURLToPath(new URL('../index.css', import.meta.url)), 'utf8')

describe('index.css motion + accent tokens', () => {
  it('defines the five motion duration tokens and the shared easing', () => {
    for (const t of ['--dur-ring', '--dur-scene', '--dur-copy', '--dur-stag', '--dur-bar', '--ease']) {
      expect(css).toContain(t)
    }
  })

  it('sets the non-reduced durations to the spec values', () => {
    expect(css).toMatch(/--dur-ring:\s*520ms/)
    expect(css).toMatch(/--dur-scene:\s*440ms/)
    expect(css).toMatch(/--dur-copy:\s*280ms/)
    expect(css).toMatch(/--dur-stag:\s*340ms/)
    expect(css).toMatch(/--dur-bar:\s*700ms/)
    expect(css).toMatch(/--ease:\s*cubic-bezier\(\.22,\s*\.8,\s*\.26,\s*1\)/)
  })

  it('collapses every duration and the stagger unit inside the reduced-motion block', () => {
    const reduced = css.slice(css.indexOf('prefers-reduced-motion'))
    for (const t of ['--dur-ring', '--dur-scene', '--dur-copy', '--dur-stag', '--dur-bar']) {
      expect(reduced).toMatch(new RegExp(`${t}:\\s*120ms`))
    }
    expect(reduced).toMatch(/--stag-delay:\s*0ms/)
  })

  it('defines --stag-delay as a real time value', () => {
    expect(css).toMatch(/--stag-delay:\s*80ms/)
  })

  it('derives --accent-line as a 34% color-mix for every flavour', () => {
    expect(css).toMatch(/--accent-line:\s*color-mix\(in srgb,\s*var\(--accent\)\s*34%/)
  })

  it('gives error-outlined controls an error-coloured focus ring', () => {
    expect(css).toMatch(/\[data-error-control\][^{]*:focus-visible/)
  })
})
