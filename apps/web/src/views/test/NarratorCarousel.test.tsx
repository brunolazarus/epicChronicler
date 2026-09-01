import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NarratorCarousel } from '../NarratorCarousel.js'

const flavours = [
  { key: 'medieval', name: 'Medieval Chronicler', description: 'A scribe' },
  { key: 'sports', name: 'Sports Commentator', description: 'A commentator' },
]

describe('NarratorCarousel', () => {
  it('selects a flavour by clicking its chip', async () => {
    const selectFlavour = vi.fn()
    render(<NarratorCarousel flavours={flavours} selectedFlavour={null} selectFlavour={selectFlavour} />)
    await userEvent.click(screen.getByTestId('carousel-chip-sports'))
    expect(selectFlavour).toHaveBeenCalledWith('sports')
  })
})
