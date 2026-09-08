import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { client } from '@chronicler/api-client'
import App from '../App.js'

vi.mock('@chronicler/api-client', () => ({ client: { GET: vi.fn(), POST: vi.fn() } }))

function renderApp() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><App /></QueryClientProvider>)
}

beforeEach(() => {
  vi.mocked(client.GET).mockResolvedValue({
    data: [{ key: 'medieval', name: 'Medieval Chronicler', description: 'A scribe' }],
    error: undefined, response: new Response(),
  } as never)
})

describe('App shell', () => {
  it('stamps the current stage on the root element', async () => {
    renderApp()
    await waitFor(() => expect(document.querySelector('[data-stage="landing"]')).toBeTruthy())
  })

  it('keeps one record ring element mounted from the start', async () => {
    renderApp()
    await waitFor(() => expect(screen.getByTestId('ring-wrapper')).toBeInTheDocument())
    // exactly one ring wrapper, always
    expect(screen.getAllByTestId('ring-wrapper')).toHaveLength(1)
  })

  it('renders the persistent top bar with the MCP server link', async () => {
    renderApp()
    await waitFor(() => expect(screen.getByRole('link', { name: 'MCP server' })).toBeInTheDocument())
    expect(screen.getByRole('link', { name: 'MCP server' })).toHaveAttribute(
      'href',
      'https://epicchronicler-production.up.railway.app/mcp',
    )
  })

  it('puts the upload notice in the ring slot, without motion, when a file is rejected', async () => {
    renderApp()
    await waitFor(() => expect(screen.getByTestId('ring-wrapper')).toBeInTheDocument())

    await userEvent.upload(
      screen.getByTestId('audio-file'),
      new File(['bytes'], 'voice.aiff', { type: 'audio/aiff' }),
    )

    const notice = await screen.findByText("That format isn't supported")
    const ringBox = screen.getByTestId('ring-wrapper').firstElementChild as HTMLElement
    expect(ringBox).toContainElement(notice)
    expect(screen.queryByTestId('btn-record')).toBeNull()
    // errors get no motion
    expect(ringBox.style.transition).toBe('none')
  })
})
