import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SceneBand } from '../SceneBand.js'

describe('SceneBand', () => {
  it('renders the scene shape stack for the given flavour', () => {
    const { container } = render(<SceneBand flavourKey="fantasy" stage="landing" />)
    // scenes.ts emits many absolutely-positioned divs; assert a non-trivial count
    expect(container.querySelectorAll('div').length).toBeGreaterThan(20)
  })

  it('sets the band height per stage', () => {
    const { rerender } = render(<SceneBand flavourKey="medieval" stage="landing" />)
    expect(screen.getByTestId('scene-band')).toHaveStyle({ height: '420px' })
    rerender(<SceneBand flavourKey="medieval" stage="processing" />)
    expect(screen.getByTestId('scene-band')).toHaveStyle({ height: '260px' })
    rerender(<SceneBand flavourKey="medieval" stage="result" />)
    expect(screen.getByTestId('scene-band')).toHaveStyle({ height: '128px' })
  })

  it('shows the flavour scene caption', () => {
    render(<SceneBand flavourKey="nature" stage="landing" />)
    expect(screen.getByText(/the jungle/i)).toBeInTheDocument()
  })
})
