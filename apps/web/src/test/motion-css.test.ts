import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// not `new URL('../index.css', import.meta.url)` — Vite statically rewrites that pattern into a
// served asset URL, so it never reaches fileURLToPath as a file: URL
const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../index.css'), 'utf8')

describe('index.css entrance motion', () => {
  it('defines the card entrance keyframe + utility on --dur-copy', () => {
    expect(css).toMatch(/@keyframes card-in/)
    expect(css).toMatch(/@utility motion-card[\s\S]*?animation:\s*card-in var\(--dur-copy\) var\(--ease\)/)
  })

  it('defines the stagger keyframe + utility driven by --stagger-index * --stag-delay', () => {
    expect(css).toMatch(/@keyframes stagger-in/)
    expect(css).toMatch(/@utility stagger-block[\s\S]*?animation:\s*stagger-in var\(--dur-stag\) var\(--ease\)/)
    expect(css).toMatch(/animation-delay:\s*calc\(var\(--stagger-index[^)]*\)\s*\*\s*var\(--stag-delay\)\)/)
  })

  it('defines the carousel duration tokens and collapses them under reduced motion', () => {
    expect(css).toMatch(/--dur-card:\s*450ms/)
    expect(css).toMatch(/--dur-dots:\s*350ms/)
    const reduced = css.slice(css.indexOf('prefers-reduced-motion'))
    expect(reduced).toMatch(/--dur-card:\s*120ms/)
    expect(reduced).toMatch(/--dur-dots:\s*120ms/)
  })
})
