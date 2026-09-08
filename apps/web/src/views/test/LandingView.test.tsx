import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LandingView } from '../LandingView.js'

const flavours = [{ key: 'medieval', name: 'Medieval Chronicler', description: 'A scribe' }]

describe('LandingView', () => {
  it('shows the sample chronicle', () => {
    render(<LandingView flavours={flavours} selectedFlavour={null} selectFlavour={vi.fn()} />)
    expect(screen.getByText(/Siege of the Flatpack Throne/)).toBeInTheDocument()
  })

  it('selects a narrator from the carousel', async () => {
    const selectFlavour = vi.fn()
    render(<LandingView flavours={flavours} selectedFlavour={null} selectFlavour={selectFlavour} />)
    await userEvent.click(screen.getByTestId('carousel-chip-medieval'))
    expect(selectFlavour).toHaveBeenCalledWith('medieval')
  })
})
