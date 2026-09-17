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

// Mirrors the real Chromium quirk this presenter works around: a fresh webm blob reports
// `duration: Infinity` on `loadedmetadata`, and only reports the real value once something
// seeks near the end (a `currentTime` write triggers `durationchange`).
type AudioBehavior = 'finite' | 'seek-resolves' | 'seek-stays-infinite' | 'error'

function makeFakeAudio(behavior: AudioBehavior, resolvedDuration: number) {
  return class FakeAudio {
    duration = behavior === 'finite' ? resolvedDuration : Infinity
    listeners: Record<string, Array<() => void>> = {}
    private _currentTime = 0
    constructor(public src: string) {}
    addEventListener(event: string, cb: () => void) {
      (this.listeners[event] ??= []).push(cb)
      if (event === 'loadedmetadata' && behavior !== 'error') cb()
      if (event === 'error' && behavior === 'error') cb()
    }
    get currentTime() {
      return this._currentTime
    }
    set currentTime(v: number) {
      this._currentTime = v
      if (v === 0) return
      if (behavior === 'seek-resolves') this.duration = resolvedDuration
      this.listeners['durationchange']?.forEach((cb) => cb())
    }
  }
}

function installRecorder({
  denied = false,
  audioDuration = 137.6,
  audioBehavior = 'finite',
}: { denied?: boolean; audioDuration?: number; audioBehavior?: AudioBehavior } = {}) {
  const originalMediaDevices = navigator.mediaDevices
  const originalRecorder = globalThis.MediaRecorder
  const originalAudio = globalThis.Audio
  const originalCreateObjectURL = URL.createObjectURL
  const originalRevokeObjectURL = URL.revokeObjectURL
  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      getUserMedia: denied
        ? vi.fn().mockRejectedValue(new Error('denied'))
        : vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }),
    },
    configurable: true,
  })
  globalThis.MediaRecorder = FakeMediaRecorder as unknown as typeof MediaRecorder
  // jsdom does not implement blob URLs or media loading; the presenter only needs the calls to
  // exist, so FakeAudio simulates loadedmetadata/durationchange/error synchronously.
  globalThis.Audio = makeFakeAudio(audioBehavior, audioDuration) as unknown as typeof Audio
  URL.createObjectURL = vi.fn(() => 'blob:mock')
  URL.revokeObjectURL = vi.fn()
  return () => {
    Object.defineProperty(navigator, 'mediaDevices', { value: originalMediaDevices, configurable: true })
    globalThis.MediaRecorder = originalRecorder
    globalThis.Audio = originalAudio
    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
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

    expect(result.current.uploadValidationError).toEqual({
      code: 'unsupported-format',
      fileName: 'voice.aiff',
      value: 'aiff',
      limit: 'webm · mp3 · mp4 · m4a · wav · ogg',
    })
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

  it('starts recording, and stopping uploads the captured audio and captures its duration', async () => {
    vi.mocked(client.GET).mockResolvedValue({ data: [], error: undefined, response: new Response() } as never)
    vi.mocked(client.POST).mockResolvedValue({ data: { jobId: 'up-1', status: 'queued' }, error: undefined, response: new Response() } as never)
    const restore = installRecorder({ audioDuration: 137.6 })

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
      await waitFor(() => expect(result.current.recordingLabel).toBe('2:18 audio'))
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock')
    } finally {
      restore()
    }
  })

  it('recovers a Chromium Infinity duration via the seek workaround', async () => {
    vi.mocked(client.GET).mockResolvedValue({ data: [], error: undefined, response: new Response() } as never)
    vi.mocked(client.POST).mockResolvedValue({ data: { jobId: 'up-1', status: 'queued' }, error: undefined, response: new Response() } as never)
    const restore = installRecorder({ audioBehavior: 'seek-resolves', audioDuration: 137.6 })

    try {
      const { result } = renderHook(() => useChroniclePresenter(), { wrapper })
      await waitFor(() => expect(result.current.flavours).toEqual([]))

      await act(async () => { await result.current.startRecording() })
      act(() => result.current.stopRecording())

      await waitFor(() => expect(result.current.recordingLabel).toBe('2:18 audio'))
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock')
    } finally {
      restore()
    }
  })

  it('leaves recordingSeconds null when duration is still not finite after the seek workaround', async () => {
    vi.mocked(client.GET).mockResolvedValue({ data: [], error: undefined, response: new Response() } as never)
    vi.mocked(client.POST).mockResolvedValue({ data: { jobId: 'up-1', status: 'queued' }, error: undefined, response: new Response() } as never)
    const restore = installRecorder({ audioBehavior: 'seek-stays-infinite' })

    try {
      const { result } = renderHook(() => useChroniclePresenter(), { wrapper })
      await waitFor(() => expect(result.current.flavours).toEqual([]))

      await act(async () => { await result.current.startRecording() })
      act(() => result.current.stopRecording())

      await waitFor(() => expect(result.current.isRecording).toBe(false))
      expect(result.current.recordingLabel).toBeNull()
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock')
    } finally {
      restore()
    }
  })

  it('revokes the object URL and leaves recordingSeconds null when the audio probe errors', async () => {
    vi.mocked(client.GET).mockResolvedValue({ data: [], error: undefined, response: new Response() } as never)
    vi.mocked(client.POST).mockResolvedValue({ data: { jobId: 'up-1', status: 'queued' }, error: undefined, response: new Response() } as never)
    const restore = installRecorder({ audioBehavior: 'error' })

    try {
      const { result } = renderHook(() => useChroniclePresenter(), { wrapper })
      await waitFor(() => expect(result.current.flavours).toEqual([]))

      await act(async () => { await result.current.startRecording() })
      act(() => result.current.stopRecording())

      await waitFor(() => expect(result.current.isRecording).toBe(false))
      expect(result.current.recordingLabel).toBeNull()
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock')
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

  it('exposes the generate job id once generation is queued', async () => {
    vi.mocked(client.GET).mockResolvedValue({ data: [], error: undefined, response: new Response() } as never)
    vi.mocked(client.POST).mockResolvedValue({ data: { jobId: 'gen-42', status: 'queued' }, error: undefined, response: new Response() } as never)
    const { result } = renderHook(() => useChroniclePresenter(), { wrapper })
    await waitFor(() => expect(result.current.flavours).toEqual([]))
    act(() => result.current.setTranscript('a tale'))
    act(() => result.current.confirmTranscript())
    await waitFor(() => expect(result.current.jobId).toBe('gen-42'))
  })

  it('builds an upload notice, clears it on "Record instead", and does not swallow the next error', async () => {
    vi.mocked(client.GET).mockResolvedValue({ data: [], error: undefined, response: new Response() } as never)

    const { result } = renderHook(() => useChroniclePresenter(), { wrapper })
    await waitFor(() => expect(result.current.flavours).toEqual([]))

    act(() => result.current.tryUploadAudio(new File(['x'], 'voice.aiff', { type: 'audio/aiff' })))
    expect(result.current.uploadNotice).toMatchObject({
      title: "That format isn't supported",
      detail: 'ERR_UNSUPPORTED_FORMAT',
      fileName: 'voice.aiff',
      value: 'aiff',
      limit: 'webm · mp3 · mp4 · m4a · wav · ogg',
    })

    act(() => result.current.clearUploadError())
    expect(result.current.uploadNotice).toBeNull()

    // a fresh attempt must reset the dismissal, or the next real error is swallowed
    act(() => result.current.tryUploadAudio(new File(['x'], 'voice.aiff', { type: 'audio/aiff' })))
    expect(result.current.uploadNotice).toMatchObject({ title: "That format isn't supported" })
  })

  it('does not raise a dismissed transcription failure again when a new recording starts', async () => {
    vi.mocked(client.GET).mockImplementation(async (path: string) => {
      if (path === '/api/v1/pipeline/flavours') {
        return { data: [], error: undefined, response: new Response() } as never
      }
      return { data: { status: 'failed', progress: 0, result: null, error: 'ERR_TRANSCRIPTION' }, error: undefined, response: new Response() } as never
    })
    vi.mocked(client.POST).mockResolvedValue({ data: { jobId: 'up-1', status: 'queued' }, error: undefined, response: new Response() } as never)
    const restore = installRecorder()

    try {
      const { result } = renderHook(() => useChroniclePresenter(), { wrapper })
      await waitFor(() => expect(result.current.flavours).toEqual([]))

      act(() => result.current.tryUploadAudio(new File(['x'], 'a.webm', { type: 'audio/webm' })))
      await waitFor(() =>
        expect(result.current.uploadNotice).toMatchObject({ title: "That recording couldn't be transcribed" }),
      )

      act(() => result.current.clearUploadError())
      expect(result.current.uploadNotice).toBeNull()

      // the notice would otherwise re-render over the ring the moment recording starts
      await act(async () => { await result.current.startRecording() })
      expect(result.current.isRecording).toBe(true)
      expect(result.current.uploadNotice).toBeNull()

      await act(async () => { await new Promise((r) => setTimeout(r, 50)) })
      expect(result.current.isRecording).toBe(true)
      expect(result.current.uploadNotice).toBeNull()
    } finally {
      restore()
    }
  })
})
