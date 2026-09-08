import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NarratorCarousel } from '../NarratorCarousel.js'

const flavours = [
  { key: 'medieval', name: 'Medieval Chronicler', description: 'A scribe' },
  { key: 'sports', name: 'Sports Commentator', description: 'A commentator' },
]

const F = [
  { key: 'medieval', name: 'Medieval Chronicler', description: 'A scribe' },
  { key: 'sports', name: 'Sports Commentator', description: 'A commentator' },
  { key: 'nature', name: 'Nature Documentary', description: 'A naturalist' },
  { key: 'fantasy', name: 'Fantasy Narrator', description: 'A storyteller' },
]

describe('NarratorCarousel', () => {
  it('selects a flavour by clicking its chip', async () => {
    const selectFlavour = vi.fn()
    render(<NarratorCarousel flavours={flavours} selectedFlavour={null} selectFlavour={selectFlavour} />)
    await userEvent.click(screen.getByTestId('carousel-chip-sports'))
    expect(selectFlavour).toHaveBeenCalledWith('sports')
  })

  it('wraps to the neighbouring narrator with the arrows', async () => {
    const selectFlavour = vi.fn()
    render(<NarratorCarousel flavours={flavours} selectedFlavour="medieval" selectFlavour={selectFlavour} />)
    await userEvent.click(screen.getByLabelText('Previous narrator'))
    expect(selectFlavour).toHaveBeenCalledWith('sports')
    await userEvent.click(screen.getByLabelText('Next narrator'))
    expect(selectFlavour).toHaveBeenCalledWith('sports')
  })

  it('selects a flavour when its dot is clicked', async () => {
    const selectFlavour = vi.fn()
    render(<NarratorCarousel flavours={F} selectedFlavour="medieval" selectFlavour={selectFlavour} />)
    await userEvent.click(screen.getByTestId('carousel-dot-nature'))
    expect(selectFlavour).toHaveBeenCalledWith('nature')
  })

  it('moves with the arrow keys', async () => {
    const selectFlavour = vi.fn()
    render(<NarratorCarousel flavours={F} selectedFlavour="medieval" selectFlavour={selectFlavour} />)
    const group = screen.getByRole('group', { name: /narrator carousel/i })
    group.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(selectFlavour).toHaveBeenCalledWith('sports')
  })
})
