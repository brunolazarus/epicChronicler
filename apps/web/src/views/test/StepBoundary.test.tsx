import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StepBoundary } from '../StepBoundary.js'

function Boom(): never {
  throw new Error('boom detail')
}

describe('StepBoundary', () => {
  it('renders children when there is no error', () => {
    render(<StepBoundary fallback={<p>loading</p>}>{<p>content</p>}</StepBoundary>)
    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('renders the raw error message when a child throws', () => {
    render(
      <StepBoundary fallback={<p>loading</p>}>
        <Boom />
      </StepBoundary>,
    )
    expect(screen.getByText(/boom detail/)).toBeInTheDocument()
  })
})
