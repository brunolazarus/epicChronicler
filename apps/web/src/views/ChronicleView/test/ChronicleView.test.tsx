import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChronicleView } from '../ChronicleView.js'

const flavours = [
  { key: 'medieval', name: 'Medieval Chronicler', description: 'A scribe' },
  { key: 'sports', name: 'Sports Commentator', description: 'A commentator' },
]

describe('ChronicleView', () => {
  it('shows the chronicle, plays audio, and retell redirects instead of regenerating', async () => {
    const retellAs = vi.fn()
    render(
      <ChronicleView chronicleText="Here follows the chronicle..." audioKey="tts-1.mp3" transcript="a tale"
        flavours={flavours} selectedFlavour="medieval" retellAs={retellAs} jobOutcome={null} restart={vi.fn()} />,
    )
    expect(screen.getByTestId('chronicle-text')).toHaveTextContent('Here follows the chronicle...')
    expect(screen.getByTestId('tts-player')).toHaveAttribute('src', '/api/v1/pipeline/audio/tts-1.mp3')

    await userEvent.click(screen.getByTestId('retell-sports'))
    expect(retellAs).toHaveBeenCalledWith('sports')
  })

  it('renders EmptyStateShell for an expired job instead of the two-column layout', () => {
    render(
      <ChronicleView chronicleText={null} audioKey={null} transcript="" flavours={flavours}
        selectedFlavour="medieval" retellAs={vi.fn()} jobOutcome="expired" restart={vi.fn()} />,
    )
    expect(screen.getByText('This session has ended')).toBeInTheDocument()
    expect(screen.queryByTestId('chronicle-text')).not.toBeInTheDocument()
  })

  it('renders EmptyStateShell generic fallback for a failed job', () => {
    render(
      <ChronicleView chronicleText={null} audioKey={null} transcript="" flavours={flavours}
        selectedFlavour="medieval" retellAs={vi.fn()} jobOutcome="failed" restart={vi.fn()} />,
    )
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.queryByTestId('chronicle-text')).not.toBeInTheDocument()
  })

  it('renders a custom play control and a 44-bar waveform', () => {
    const { container } = render(<ChronicleView
      chronicleText={'A legend.\n\nThe payoff.'} audioKey="tts-x.mp3" transcript="t"
      flavours={[{ key: 'medieval', name: 'Medieval Chronicler', description: 'x' }]}
      selectedFlavour="medieval" retellAs={() => {}} jobOutcome={null} restart={() => {}} jobId="8f31"
    />)
    expect(screen.getByTestId('btn-playpause')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-wavebar]')).toHaveLength(44)
    expect(screen.getByTestId('tts-player')).toBeInTheDocument()
  })

  it('shows a derived word count in the chronicle meta', () => {
    render(<ChronicleView chronicleText={'one two three four five'} audioKey={null} transcript="t"
      flavours={[]} selectedFlavour="medieval" retellAs={() => {}} jobOutcome={null} restart={() => {}} jobId="8f31" />)
    expect(screen.getByText(/5 words/)).toBeInTheDocument()
  })

  it('assigns ascending stagger indices to the four right-column blocks', () => {
    const { container } = render(<ChronicleView
      chronicleText={'A legend.\n\nThe payoff.'} audioKey="tts-x.mp3" transcript="t"
      flavours={[{ key: 'medieval', name: 'Medieval Chronicler', description: 'x' }]}
      selectedFlavour="medieval" retellAs={() => {}} jobOutcome={null} restart={() => {}} jobId="8f31"
    />)
    const idx = [...container.querySelectorAll('[data-stagger]')].map((el) => Number((el as HTMLElement).dataset.stagger))
    expect(idx).toEqual([0, 1, 2, 3])
  })

  it('does not stagger the expired/failed empty state', () => {
    const { container } = render(<ChronicleView
      chronicleText={null} audioKey={null} transcript="t" flavours={[]}
      selectedFlavour="medieval" retellAs={() => {}} jobOutcome={'expired'} restart={() => {}} jobId="8f31"
    />)
    expect(container.querySelectorAll('[data-stagger]')).toHaveLength(0)
  })
})
