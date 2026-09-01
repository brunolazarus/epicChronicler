import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { client } from '@chronicler/api-client'
import { useJobPoll, JobExpiredError } from '../useJobPoll.js'

vi.mock('@chronicler/api-client', () => ({
  client: { GET: vi.fn() },
}))

afterEach(() => vi.resetAllMocks())

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient()
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('useJobPoll', () => {
  it('does not fetch when jobId is null', () => {
    renderHook(() => useJobPoll(null), { wrapper })
    expect(client.GET).not.toHaveBeenCalled()
  })

  it('fetches job status when jobId is set', async () => {
    vi.mocked(client.GET).mockResolvedValue({
      data: { status: 'completed', progress: 100, result: { transcript: 'hi' }, error: null },
      error: undefined,
      response: new Response(),
    } as never)

    const { result } = renderHook(() => useJobPoll('job-1'), { wrapper })

    await waitFor(() => expect(result.current.data?.status).toBe('completed'))
    expect(client.GET).toHaveBeenCalledWith('/api/v1/pipeline/jobs/{id}', {
      params: { path: { id: 'job-1' } },
    })
  })

  it('throws JobExpiredError on a 404 response', async () => {
    vi.mocked(client.GET).mockResolvedValue({
      data: undefined,
      error: { error: 'Job not found' },
      response: new Response(null, { status: 404 }),
    } as never)

    const { result } = renderHook(() => useJobPoll('gone'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(JobExpiredError)
  })

  it('stops polling once the job has expired', async () => {
    vi.mocked(client.GET).mockResolvedValue({
      data: undefined,
      error: { error: 'Job not found' },
      response: new Response(null, { status: 404 }),
    } as never)

    const { result } = renderHook(() => useJobPoll('gone'), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(JobExpiredError)

    const callsAtFailure = vi.mocked(client.GET).mock.calls.length
    await new Promise((r) => setTimeout(r, 1500))

    expect(vi.mocked(client.GET).mock.calls.length).toBe(callsAtFailure)
  })

  it('keeps polling through a transient (non-404) poll error', async () => {
    vi.mocked(client.GET).mockResolvedValue({
      data: undefined,
      error: { error: 'Upstream unavailable' },
      response: new Response(null, { status: 503 }),
    } as never)

    const { result } = renderHook(() => useJobPoll('flaky'), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).not.toBeInstanceOf(JobExpiredError)

    const callsAtFailure = vi.mocked(client.GET).mock.calls.length
    await waitFor(
      () => expect(vi.mocked(client.GET).mock.calls.length).toBeGreaterThan(callsAtFailure),
      { timeout: 2000 },
    )
  })

  it('keeps polling while the job is still running', async () => {
    vi.mocked(client.GET).mockResolvedValue({
      data: { status: 'active', progress: 20, result: null, error: null },
      error: undefined,
      response: new Response(),
    } as never)

    const { result } = renderHook(() => useJobPoll('running'), { wrapper })
    await waitFor(() => expect(result.current.data?.status).toBe('active'))

    await waitFor(() => expect(vi.mocked(client.GET).mock.calls.length).toBeGreaterThan(1), { timeout: 2000 })
  })
})
