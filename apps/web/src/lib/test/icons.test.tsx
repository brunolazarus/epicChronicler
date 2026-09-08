import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MicrophoneSlashIcon, WarningCircleIcon, PlayIcon } from '../icons.js'

describe('icons', () => {
  it('renders an inline svg that inherits currentColor', () => {
    const { container } = render(<WarningCircleIcon />)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
    expect(svg!.getAttribute('fill')).toBe('currentColor')
  })

  it('honours the size prop', () => {
    const { container } = render(<MicrophoneSlashIcon size={34} />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('34')
    expect(svg.getAttribute('height')).toBe('34')
  })

  it('exports a play glyph', () => {
    const { container } = render(<PlayIcon />)
    expect(container.querySelector('svg')).toBeTruthy()
  })
})
