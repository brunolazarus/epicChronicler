import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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

class FakeMediaRecorder {
  mimeType = 'audio/webm'
  ondataavailable: ((e: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  start() {}
  stop() {}
}

function installRecorder() {
  const originalMediaDevices = navigator.mediaDevices
  const originalRecorder = globalThis.MediaRecorder
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }) },
    configurable: true,
  })
  globalThis.MediaRecorder = FakeMediaRecorder as unknown as typeof MediaRecorder
  return () => {
    Object.defineProperty(navigator, 'mediaDevices', { value: originalMediaDevices, configurable: true })
    globalThis.MediaRecorder = originalRecorder
  }
}

afterEach(() => vi.resetAllMocks())

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

  it('keeps the ring mounted when recording starts after a dismissed transcription failure', async () => {
    vi.mocked(client.GET).mockImplementation(async (path: string) => {
      if (path === '/api/v1/pipeline/flavours') {
        return { data: [{ key: 'medieval', name: 'Medieval Chronicler', description: 'A scribe' }], error: undefined, response: new Response() } as never
      }
      return { data: { status: 'failed', progress: 0, result: null, error: 'ERR_TRANSCRIPTION' }, error: undefined, response: new Response() } as never
    })
    vi.mocked(client.POST).mockResolvedValue({ data: { jobId: 'up-1', status: 'queued' }, error: undefined, response: new Response() } as never)
    const restore = installRecorder()

    try {
      renderApp()
      await waitFor(() => expect(screen.getByTestId('ring-wrapper')).toBeInTheDocument())
      const ringBox = screen.getByTestId('ring-wrapper').firstElementChild

      await userEvent.upload(
        screen.getByTestId('audio-file'),
        new File(['bytes'], 'a.webm', { type: 'audio/webm' }),
      )
      await screen.findByText("That recording couldn't be transcribed")

      await userEvent.click(screen.getByRole('button', { name: 'Record instead' }))
      expect(screen.getByTestId('btn-record')).toBeInTheDocument()

      await userEvent.click(screen.getByTestId('btn-record'))

      // the stale notice must not take the ring slot back while MediaRecorder is running
      await waitFor(() => expect(document.querySelector('[data-recording="true"]')).toBeTruthy())
      expect(screen.getByTestId('btn-record')).toHaveTextContent('0:00')
      expect(screen.queryByText("That recording couldn't be transcribed")).toBeNull()
      expect(screen.getByTestId('ring-wrapper').firstElementChild).toBe(ringBox)
    } finally {
      restore()
    }
  })
})
