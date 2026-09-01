import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReviewStep } from '../ReviewStep.js'

describe('ReviewStep', () => {
  it('edits the transcript and confirms', async () => {
    const setTranscript = vi.fn()
    const confirmTranscript = vi.fn()
    render(<ReviewStep transcript="a tale" setTranscript={setTranscript} confirmTranscript={confirmTranscript} />)
    expect(screen.getByTestId('transcript')).toHaveValue('a tale')
    await userEvent.type(screen.getByTestId('transcript'), '!')
    expect(setTranscript).toHaveBeenCalled()
    await userEvent.click(screen.getByTestId('btn-generate'))
    expect(confirmTranscript).toHaveBeenCalled()
  })
})
