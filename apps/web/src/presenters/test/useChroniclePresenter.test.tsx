import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Suspense } from 'react'
import { client } from '@chronicler/api-client'
import { useChroniclePresenter } from '../useChroniclePresenter.js'

vi.mock('@chronicler/api-client', () => ({
  client: { GET: vi.fn(), POST: vi.fn() },
}))

afterEach(() => vi.resetAllMocks())

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient()
  return (
    <QueryClientProvider client={qc}>
      <Suspense fallback="loading">{children}</Suspense>
    </QueryClientProvider>
  )
}

class FakeMediaRecorder {
  mimeType = 'audio/webm'
  ondataavailable: ((e: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  start() {}
  stop() {
    this.ondataavailable?.({ data: new Blob(['audio'], { type: 'audio/webm' }) })
    this.onstop?.()
  }
}

function installRecorder({ denied = false } = {}) {
  const originalMediaDevices = navigator.mediaDevices
  const originalRecorder = globalThis.MediaRecorder
  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      getUserMedia: denied
        ? vi.fn().mockRejectedValue(new Error('denied'))
        : vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }),
    },
    configurable: true,
  })
  globalThis.MediaRecorder = FakeMediaRecorder as unknown as typeof MediaRecorder
  return () => {
    Object.defineProperty(navigator, 'mediaDevices', { value: originalMediaDevices, configurable: true })
    globalThis.MediaRecorder = originalRecorder
  }
}

describe('useChroniclePresenter', () => {
  it('loads flavours, defaults to the medieval narrator, and lets you select another', async () => {
    vi.mocked(client.GET).mockResolvedValue({
      data: [{ key: 'medieval', name: 'Medieval Chronicler', description: 'A scribe' }],
      error: undefined,
      response: new Response(),
    } as never)

    const { result } = renderHook(() => useChroniclePresenter(), { wrapper })

    await waitFor(() => expect(result.current.flavours.length).toBe(1))
    expect(result.current.selectedFlavour).toBe('medieval')

    act(() => result.current.selectFlavour('sports'))
    expect(result.current.selectedFlavour).toBe('sports')
  })

  it('generates with the default flavour when the user never touches the carousel', async () => {
    vi.mocked(client.GET).mockResolvedValue({ data: [], error: undefined, response: new Response() } as never)
    vi.mocked(client.POST).mockResolvedValue({ data: { jobId: 'gen-1', status: 'queued' }, error: undefined, response: new Response() } as never)

    const { result } = renderHook(() => useChroniclePresenter(), { wrapper })
    await waitFor(() => expect(result.current.flavours).toEqual([]))

    act(() => result.current.setTranscript('a tale'))
    act(() => result.current.confirmTranscript())

    expect(result.current.stage).toBe('processing')
    await waitFor(() =>
      expect(client.POST).toHaveBeenCalledWith('/api/v1/pipeline/generate', {
        body: { transcripts: [{ speaker: 'Narrator', text: 'a tale' }], flavour: 'medieval' },
      }),
    )
  })

  it('starts on the landing stage and moves to review once transcription completes', async () => {
    vi.mocked(client.GET).mockImplementation(async (path: string) => {
      if (path === '/api/v1/pipeline/flavours') {
        return { data: [{ key: 'medieval', name: 'Medieval Chronicler', description: 'A scribe' }], error: undefined, response: new Response() } as never
      }
      return { data: { status: 'completed', progress: 100, result: { transcript: 'a tale' }, error: null }, error: undefined, response: new Response() } as never
    })
    vi.mocked(client.POST).mockResolvedValue({ data: { jobId: 'up-1', status: 'queued' }, error: undefined, response: new Response() } as never)

    const { result } = renderHook(() => useChroniclePresenter(), { wrapper })
    await waitFor(() => expect(result.current.flavours.length).toBe(1))
    expect(result.current.stage).toBe('landing')

    act(() => result.current.tryUploadAudio(new File(['x'], 'a.webm', { type: 'audio/webm' })))
    await waitFor(() => expect(result.current.stage).toBe('review'))
    expect(result.current.transcript).toBe('a tale')
  })

  it('holds the rewrite and reports the footer data while on review', async () => {
    vi.mocked(client.GET).mockImplementation(async (path: string) => {
      if (path === '/api/v1/pipeline/flavours') {
        return { data: [{ key: 'medieval', name: 'Medieval Chronicler', description: 'A scribe' }], error: undefined, response: new Response() } as never
      }
      return { data: { status: 'completed', progress: 100, result: { transcript: 'a tale' }, error: null }, error: undefined, response: new Response() } as never
    })
    vi.mocked(client.POST).mockResolvedValue({ data: { jobId: 'up-1', status: 'queued' }, error: undefined, response: new Response() } as never)

    const { result } = renderHook(() => useChroniclePresenter(), { wrapper })
    await waitFor(() => expect(result.current.flavours.length).toBe(1))

    act(() => result.current.tryUploadAudio(new File(['x'], 'a.webm', { type: 'audio/webm' })))
    await waitFor(() => expect(result.current.stage).toBe('review'))

    act(() => result.current.setTranscript('a wild tale'))
    expect(result.current.stages[1]).toMatchObject({ key: 'rewrite', status: 'held' })
    expect(result.current.stages[2]).toMatchObject({ key: 'narrate', status: 'queued' })
    expect(result.current.transcriptWordCount).toBe(3)
    expect(result.current.recordingLabel).toBeNull()
  })

  it('rejects an invalid file without calling the upload API', async () => {
    vi.mocked(client.GET).mockResolvedValue({ data: [], error: undefined, response: new Response() } as never)
    const { result } = renderHook(() => useChroniclePresenter(), { wrapper })
    await waitFor(() => expect(result.current.flavours).toEqual([]))

    act(() => result.current.tryUploadAudio(new File(['x'], 'voice.aiff', { type: 'audio/aiff' })))

    expect(result.current.uploadValidationError).toEqual({ code: 'unsupported-format', detail: 'aiff' })
    expect(client.POST).not.toHaveBeenCalled()
  })

  it('derives pipeline stages from generate progress, and restart resets to landing', async () => {
    vi.mocked(client.GET).mockResolvedValue({ data: [], error: undefined, response: new Response() } as never)
    const { result } = renderHook(() => useChroniclePresenter(), { wrapper })
    await waitFor(() => expect(result.current.flavours).toEqual([]))

    act(() => result.current.selectFlavour('medieval'))
    act(() => result.current.setTranscript('a tale'))
    expect(result.current.stages[0]).toMatchObject({ key: 'transcribe', status: 'done' })

    act(() => result.current.restart())
    expect(result.current.stage).toBe('landing')
    expect(result.current.selectedFlavour).toBe('medieval')

    act(() => result.current.retellAs('sports'))
    expect(result.current.stage).toBe('landing')
    expect(result.current.selectedFlavour).toBe('sports')
  })

  it('marks jobOutcome failed but stays on processing when the generate job fails (HTTP 200 with status: failed body)', async () => {
    vi.mocked(client.GET).mockImplementation(async (path: string) => {
      if (path === '/api/v1/pipeline/flavours') {
        return { data: [{ key: 'medieval', name: 'Medieval Chronicler', description: 'A scribe' }], error: undefined, response: new Response() } as never
      }
      return { data: { status: 'failed', progress: 40, result: null, error: 'boom' }, error: undefined, response: new Response() } as never
    })
    vi.mocked(client.POST).mockResolvedValue({ data: { jobId: 'gen-1', status: 'queued' }, error: undefined, response: new Response() } as never)

    const { result } = renderHook(() => useChroniclePresenter(), { wrapper })
    await waitFor(() => expect(result.current.flavours.length).toBe(1))

    act(() => result.current.selectFlavour('medieval'))
    act(() => result.current.setTranscript('a tale'))
    act(() => result.current.confirmTranscript())

    await waitFor(() => expect(result.current.jobOutcome).toBe('failed'))
    expect(result.current.stage).toBe('processing')
    expect(result.current.stages[1]).toMatchObject({ key: 'rewrite', status: 'failed' })
    expect(result.current.stages[2]).toMatchObject({ key: 'narrate', status: 'blocked' })
    expect(result.current.generateError).toBe('boom')
  })

  it('marks jobOutcome failed when the generate POST itself fails (e.g. a 429)', async () => {
    vi.mocked(client.GET).mockResolvedValue({ data: [], error: undefined, response: new Response() } as never)
    vi.mocked(client.POST).mockResolvedValue({
      data: undefined,
      error: { error: 'Too many requests' },
      response: new Response(null, { status: 429 }),
    } as never)

    const { result } = renderHook(() => useChroniclePresenter(), { wrapper })
    await waitFor(() => expect(result.current.flavours).toEqual([]))

    act(() => result.current.setTranscript('a tale'))
    act(() => result.current.confirmTranscript())

    await waitFor(() => expect(result.current.jobOutcome).toBe('failed'))
    expect(result.current.stage).toBe('processing')
    expect(result.current.stages[1]).toMatchObject({ key: 'rewrite', status: 'failed' })
  })

  it('advances to result when the generate job has expired (404)', async () => {
    vi.mocked(client.GET).mockImplementation(async (path: string) => {
      if (path === '/api/v1/pipeline/flavours') {
        return { data: [], error: undefined, response: new Response() } as never
      }
      return { data: undefined, error: { error: 'Job not found' }, response: new Response(null, { status: 404 }) } as never
    })
    vi.mocked(client.POST).mockResolvedValue({ data: { jobId: 'gen-1', status: 'queued' }, error: undefined, response: new Response() } as never)

    const { result } = renderHook(() => useChroniclePresenter(), { wrapper })
    await waitFor(() => expect(result.current.flavours).toEqual([]))

    act(() => result.current.setTranscript('a tale'))
    act(() => result.current.confirmTranscript())

    await waitFor(() => expect(result.current.jobOutcome).toBe('expired'))
    expect(result.current.stage).toBe('result')
  })

  it('starts recording, and stopping uploads the captured audio', async () => {
    vi.mocked(client.GET).mockResolvedValue({ data: [], error: undefined, response: new Response() } as never)
    vi.mocked(client.POST).mockResolvedValue({ data: { jobId: 'up-1', status: 'queued' }, error: undefined, response: new Response() } as never)
    const restore = installRecorder()

    try {
      const { result } = renderHook(() => useChroniclePresenter(), { wrapper })
      await waitFor(() => expect(result.current.flavours).toEqual([]))
      expect(result.current.isRecording).toBe(false)

      await act(async () => { await result.current.startRecording() })
      expect(result.current.isRecording).toBe(true)
      expect(result.current.elapsedLabel).toBe('0:00')

      act(() => result.current.stopRecording())

      await waitFor(() => expect(result.current.isRecording).toBe(false))
      expect(client.POST).toHaveBeenCalledWith('/api/v1/pipeline/upload', expect.anything())
    } finally {
      restore()
    }
  })

  it('flags micError when the browser denies the microphone', async () => {
    vi.mocked(client.GET).mockResolvedValue({ data: [], error: undefined, response: new Response() } as never)
    const restore = installRecorder({ denied: true })

    try {
      const { result } = renderHook(() => useChroniclePresenter(), { wrapper })
      await waitFor(() => expect(result.current.flavours).toEqual([]))

      await act(async () => { await result.current.startRecording() })

      expect(result.current.micError).toBe(true)
      expect(result.current.isRecording).toBe(false)
      expect(result.current.uploadNotice).toBeNull()
    } finally {
      restore()
    }
  })

  it('builds an upload notice, clears it on "Record instead", and does not swallow the next error', async () => {
    vi.mocked(client.GET).mockResolvedValue({ data: [], error: undefined, response: new Response() } as never)

    const { result } = renderHook(() => useChroniclePresenter(), { wrapper })
    await waitFor(() => expect(result.current.flavours).toEqual([]))

    act(() => result.current.tryUploadAudio(new File(['x'], 'voice.aiff', { type: 'audio/aiff' })))
    expect(result.current.uploadNotice).toMatchObject({ title: "That format isn't supported", detail: 'aiff' })

    act(() => result.current.clearUploadError())
    expect(result.current.uploadNotice).toBeNull()

    // a fresh attempt must reset the dismissal, or the next real error is swallowed
    act(() => result.current.tryUploadAudio(new File(['x'], 'voice.aiff', { type: 'audio/aiff' })))
    expect(result.current.uploadNotice).toMatchObject({ title: "That format isn't supported" })
  })
})
